const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuración de TiDB
const dbConfig = {
    host: process.env.TIDB_HOST,
    port: Number(process.env.TIDB_PORT),
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE,
    ssl: process.env.TIDB_ENABLE_SSL === 'true' ? {} : null
};

// Configuración de IA (DeepSeek) con fetch para Node.js 16
const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
    fetch: fetch
});

// ============================================
// RUTAS DE PRUEBA
// ============================================

app.get('/', (req, res) => {
    res.json({
        message: '🚀 API con IA Real (DeepSeek)',
        status: 'online',
        nodeVersion: process.version,
        endpoints: {
            health: '/health',
            test: '/test-db',
            register: '/register',
            generate: '/generate-description',
            history: '/my-descriptions/:userId'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/test-db', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT VERSION() as version');
        
        res.json({
            success: true,
            message: '✅ Conexión a TiDB exitosa',
            dbVersion: rows[0].version
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            success: false,
            message: '❌ Error conectando a TiDB',
            error: error.message
        });
    } finally {
        if (connection) await connection.end();
    }
});

// ============================================
// RUTAS DE USUARIOS
// ============================================

app.post('/register', async (req, res) => {
    const { email, full_name } = req.body;
    let connection;

    if (!email) {
        return res.status(400).json({ error: 'Email es requerido' });
    }

    try {
        connection = await mysql.createConnection(dbConfig);
        
        const userId = uuidv4();
        
        await connection.execute(
            'INSERT INTO profiles (id, email, full_name, plan) VALUES (?, ?, ?, ?)',
            [userId, email, full_name || '', 'free']
        );
        
        await connection.execute(
            'INSERT INTO usage_limits (user_id, count, month) VALUES (?, 0, CURDATE())',
            [userId]
        );

        res.json({
            success: true,
            message: 'Usuario registrado correctamente',
            user_id: userId
        });

    } catch (error) {
        console.error('Error en registro:', error.message);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        
        res.status(500).json({ 
            error: 'Error al registrar usuario',
            details: error.message 
        });
    } finally {
        if (connection) await connection.end();
    }
});

// ============================================
// RUTAS DE DESCRIPCIONES CON IA REAL (DEEPSEEK)
// ============================================

app.post('/generate-description', async (req, res) => {
    const { user_id, product_details, tone } = req.body;
    let connection;

    if (!user_id || !product_details || !tone) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    try {
        connection = await mysql.createConnection(dbConfig);

        // Verificar límite del usuario
        const [usageRows] = await connection.execute(
            'SELECT ul.count, p.plan FROM usage_limits ul JOIN profiles p ON ul.user_id = p.id WHERE ul.user_id = ? AND ul.month = CURDATE()',
            [user_id]
        );

        let currentCount = 0;
        let plan = 'free';

        if (usageRows.length > 0) {
            currentCount = usageRows[0].count;
            plan = usageRows[0].plan;
        } else {
            const [profileRows] = await connection.execute(
                'SELECT plan FROM profiles WHERE id = ?',
                [user_id]
            );
            if (profileRows.length > 0) {
                plan = profileRows[0].plan;
            }
        }

        const limit = plan === 'free' ? 5 : plan === 'pro' ? 50 : 1000;

        if (currentCount >= limit) {
            return res.status(403).json({
                error: 'Límite de generaciones alcanzado',
                plan,
                limit,
                current: currentCount
            });
        }

        // ============================================
        // GENERAR DESCRIPCIÓN CON DEEPSEEK
        // ============================================
        
        // Crear prompt según el tono seleccionado
        const tonePrompts = {
            persuasive: "Write a persuasive, benefit-focused product description that drives sales. Use compelling language and highlight why this product is a must-have. Target audience: US online shoppers.",
            casual: "Write a casual, friendly, and conversational product description. Make it sound like a friend recommending the product. Target audience: US online shoppers.",
            luxury: "Write an elegant, sophisticated, and premium product description. Use refined language that conveys luxury and exclusivity. Target audience: US online shoppers."
        };

        const prompt = `${tonePrompts[tone] || tonePrompts.persuasive}\n\nProduct details: ${product_details}\n\nDescription:`;

        // Llamar a la API de DeepSeek
        const completion = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'You are a professional e-commerce copywriter specializing in product descriptions for the US market.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 300
        });

        const generated = completion.choices[0].message.content;

        // Guardar descripción
        await connection.execute(
            'INSERT INTO descriptions (user_id, product_details, tone, generated_description) VALUES (?, ?, ?, ?)',
            [user_id, product_details, tone, generated]
        );

        // Actualizar contador
        if (usageRows.length > 0) {
            await connection.execute(
                'UPDATE usage_limits SET count = count + 1 WHERE user_id = ? AND month = CURDATE()',
                [user_id]
            );
        } else {
            await connection.execute(
                'INSERT INTO usage_limits (user_id, count, month) VALUES (?, 1, CURDATE())',
                [user_id]
            );
        }

        res.json({
            success: true,
            description: generated,
            remaining: limit - (currentCount + 1)
        });

    } catch (error) {
        console.error('Error generando descripción:', error);
        
        // Fallback a descripción simulada si la IA falla
        const fallbackDescriptions = {
            persuasive: `Discover the ultimate in comfort and style with this premium product. Perfect for any occasion, it's designed to exceed your expectations and become your new favorite. Order now and experience the difference!`,
            casual: `Hey! Check out this awesome item. It's super comfy, looks great, and you're going to love it. Perfect for everyday wear or just chilling. Grab yours today!`,
            luxury: `Indulge in unparalleled elegance with this exquisite piece. Crafted with meticulous attention to detail using the finest materials. A statement of sophistication for the discerning individual.`
        };
        
        res.json({
            success: true,
            description: fallbackDescriptions[tone] || fallbackDescriptions.persuasive,
            remaining: limit - (currentCount + 1),
            warning: 'Using fallback description (IA unavailable)'
        });
    } finally {
        if (connection) await connection.end();
    }
});

// Obtener historial de descripciones
app.get('/my-descriptions/:userId', async (req, res) => {
    const { userId } = req.params;
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        
        const [rows] = await connection.execute(
            'SELECT * FROM descriptions WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        res.json({
            success: true,
            descriptions: rows
        });

    } catch (error) {
        console.error('Error obteniendo historial:', error.message);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log(`✅ Servidor con IA en http://localhost:${PORT}`);
    console.log(`🗄️  TiDB conectado: ${dbConfig.host}`);
    console.log(`🤖 IA: DeepSeek conectada`);
    console.log(`📚 Endpoints disponibles:`);
    console.log(`   GET  /`);
    console.log(`   GET  /health`);
    console.log(`   GET  /test-db`);
    console.log(`   POST /register`);
    console.log(`   POST /generate-description (con IA REAL)`);
    console.log(`   GET  /my-descriptions/:userId`);
});
