import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import path from 'path'

import productsRouter from './routes/products.js'
import catalogsRouter from './routes/catalogs.js'
import authRouter from './routes/auth.js'
import contactsRouter from './routes/contacts.js'
import quotesRouter from './routes/quotes.js'
import footerRouter from './routes/footer.js'
import whatsappRouter from './routes/whatsapp.js'
import assetsRouter from './routes/assets.js'
import { scanAssets } from './utils/assetScanner.js'
import Admin from './models/Admin.js'
import Product from './models/Product.js'
import Catalog from './models/Catalog.js'
import FooterSettings from './models/FooterSettings.js'
import WhatsAppSettings from './models/WhatsAppSettings.js'

dotenv.config()

const app = express()

// Track DB connection state
let dbConnected = false

// Reduce mongoose buffer timeout to prevent long waits when DB is down
mongoose.set('bufferTimeoutMS', 3000)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '20mb' }))

// Middleware to check DB availability
app.use('/api', (req, res, next) => {
  // Allow health check always
  if (req.path === '/health') return next()
  // For GET requests, allow even without DB (routes handle fallback)
  // For POST/PUT/DELETE, require DB
  if (!dbConnected && req.method !== 'GET') {
    return res.status(503).json({ 
      success: false, 
      message: 'Database is not connected. Please try again later.' 
    })
  }
  next()
})

// Serve static assets
app.use('/assets', express.static(path.join(process.cwd(), 'assets')))

// Routes
app.use('/api/products', productsRouter)
app.use('/api/catalogs', catalogsRouter)
app.use('/api/auth', authRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/quotes', quotesRouter)
app.use('/api/footer', footerRouter)
app.use('/api/whatsapp', whatsappRouter)
app.use('/api/assets', assetsRouter)

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', dbConnected, time: new Date() }))

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ success: false, message: 'Internal server error' })
})

// ── Seed default admin & products on first run ──────────────────────────
const seedData = async () => {
  // Default admin
  const adminCount = await Admin.countDocuments()
  if (adminCount === 0) {
    const hashed = await bcrypt.hash('admin123', 10)
    await Admin.create({ email: 'admin@corporategifts.com', password: hashed })
    console.log('✅ Default admin seeded → email: admin@corporategifts.com / password: admin123')
  }

  // Seed default footer settings
  const footerCount = await FooterSettings.countDocuments()
  if (footerCount === 0) {
    await FooterSettings.create({
      quickLinks: [
        { label: 'Home', url: '/' },
        { label: 'Products', url: '/products' },
        { label: 'Contact', url: '/contact' },
      ],
    })
    console.log('✅ Default footer settings seeded')
  }

  // Seed 16 products
  const productCount = await Product.countDocuments()
  if (productCount === 0) {
    const products = [
      // Corporate Gifts
      { name: 'Executive Gift Combo Box', category: 'corporate-gifts', subcategory: 'gift-combo', price: 7499, description: 'Premium executive combo with leather notebook, pen set, and cufflinks.', imageUrl: 'https://images.unsplash.com/photo-1549298240-075b4c31a95c?w=500', stock: 50 },
      { name: 'Festive Hamper Deluxe', category: 'corporate-gifts', subcategory: 'hampers', price: 10999, description: 'Luxury festive hamper with gourmet chocolates, dry fruits, and premium tea.', imageUrl: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=500', stock: 30 },
      { name: 'Custom Branded T-Shirt', category: 'corporate-gifts', subcategory: 'corporate-apparel', price: 2099, description: 'High-quality cotton T-shirt with custom company logo printing.', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', stock: 200 },
      { name: 'Premium Diary & Pen Set', category: 'corporate-gifts', subcategory: 'personalized', price: 3899, description: 'Italian leather diary with premium metal pen set. Custom embossing available.', imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500', stock: 75 },
      // Eco-Friendly
      { name: 'Eco Jute Gift Bag', category: 'eco-friendly', subcategory: 'jute-bags', price: 749, description: 'Eco-friendly jute bags with laminated branding.', imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500', stock: 300 },
      { name: 'Bamboo Wireless Charging Pad', category: 'eco-friendly', subcategory: 'bamboo-items', price: 2899, description: 'Eco-friendly bamboo wireless charger for all Qi-enabled devices.', imageUrl: 'https://images.unsplash.com/photo-1586816879360-004f5c8cb4b0?w=500', stock: 80 },
      { name: 'Recycled Cotton Tote Bag', category: 'eco-friendly', subcategory: 'recycled', price: 1699, description: '100% recycled cotton tote bag with custom company logo.', imageUrl: 'https://images.unsplash.com/photo-1591561954557-2694f69732b2?w=500', stock: 150 },
      { name: 'Desktop Plant Kit', category: 'eco-friendly', subcategory: 'plant-kits', price: 2099, description: 'Mini succulent desk planter with branded ceramic pot.', imageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=500', stock: 60 },
      // Tech Gifts
      { name: 'Smart Bluetooth Speaker', category: 'tech-gifts', subcategory: 'smart-gadgets', price: 6699, description: 'Premium Bluetooth speaker with 360° sound and 12-hour battery.', imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7fd?w=500', stock: 45 },
      { name: 'Wireless Earbuds Pro', category: 'tech-gifts', subcategory: 'earbuds', price: 10999, description: 'Premium wireless earbuds with active noise cancellation.', imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500', stock: 40 },
      { name: 'Smart Watch Elite', category: 'tech-gifts', subcategory: 'smart-gadgets', price: 20999, description: 'Premium smartwatch with health monitoring, GPS, and 7-day battery.', imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f28a9a27?w=500', stock: 25 },
      { name: 'Fast Wireless Charger', category: 'tech-gifts', subcategory: 'wireless-chargers', price: 3399, description: '15W fast wireless charging pad with LED indicator.', imageUrl: 'https://images.unsplash.com/photo-1586816879360-004f5c8cb4b0?w=500', stock: 100 },
      // Luxury
      { name: 'Crystal Decanter Set', category: 'luxury', subcategory: 'wine-sets', price: 15999, description: 'Hand-blown crystal decanter with matching glasses.', imageUrl: 'https://images.unsplash.com/photo-1569529238715-0f628f5a5fa7?w=500', stock: 20 },
      { name: 'Italian Leather Travel Bag', category: 'luxury', subcategory: 'leather-goods', price: 24999, description: 'Handcrafted Italian leather travel bag with multiple compartments.', imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500', stock: 15 },
      { name: 'Crystal Award Trophy', category: 'luxury', subcategory: 'crystal-awards', price: 8399, description: 'Custom designed crystal award for recognition.', imageUrl: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=500', stock: 35 },
      { name: 'Luxury Pen Set Collection', category: 'luxury', subcategory: 'premium-pens', price: 12499, description: 'Premium metal pen set in handcrafted wooden box with laser engraving.', imageUrl: 'https://images.unsplash.com/photo-1583485088034-697e5b071fca?w=500', stock: 50 },
    ]
    await Product.insertMany(products)
    console.log('✅ 16 sample products seeded')
  }

  // Auto-sync assets on startup
  try {
    const { products: assetProducts, catalogs: assetCatalogs } = scanAssets()
    
    if (assetProducts.length > 0) {
      for (const product of assetProducts) {
        await Product.findOneAndUpdate(
          { name: product.name, category: product.category },
          product,
          { upsert: true, new: true }
        )
      }
      console.log(`✅ Auto-synced ${assetProducts.length} products from assets`)
    }

    if (assetCatalogs.length > 0) {
      for (const catalog of assetCatalogs) {
        await Catalog.findOneAndUpdate(
          { category: catalog.category },
          catalog,
          { upsert: true, new: true }
        )
      }
      console.log(`✅ Auto-synced ${assetCatalogs.length} catalogs from assets`)
    }
  } catch (err) {
    console.log('⚠️  Asset auto-sync skipped:', err.message)
  }
}

// Connect MongoDB & start server
const PORT = process.env.PORT || 3001

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  })
  .then(async () => {
    dbConnected = true
    console.log('✅ MongoDB connected')
    await seedData()
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message)
    console.error('👉 Please update MONGODB_URI in backend/.env')
    // Start server without DB for development
    app.listen(PORT, () => console.log(`⚠️  Server running WITHOUT DB on http://localhost:${PORT}`))
  })

// Handle MongoDB connection events
mongoose.connection.on('connected', () => { dbConnected = true })
mongoose.connection.on('disconnected', () => { dbConnected = false })
mongoose.connection.on('error', () => { dbConnected = false })
