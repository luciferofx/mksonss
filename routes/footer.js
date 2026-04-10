import express from 'express'
import FooterSettings from '../models/FooterSettings.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// GET footer settings (public)
router.get('/', async (req, res) => {
  try {
    const settings = await FooterSettings.getSettings()
    res.json({ success: true, data: settings })
  } catch (err) {
    if (err.name === 'MongooseError' || err.name === 'MongoNotConnectedError' || err.message?.includes('buffering timed out')) {
      return res.json({ success: true, data: {
        brandName: 'Corporate Gifts',
        brandDescription: 'Premium corporate gifting solutions',
        contactEmail: 'info@corporategiftsemporium.com',
        contactPhone: '+91 98765 43210',
        address: '123 Business District, Corporate City, India 400001',
        socialLinks: { facebook: '#', twitter: '#', instagram: '#', linkedin: '#' },
        quickLinks: [
          { label: 'Home', url: '/' },
          { label: 'Products', url: '/products' },
          { label: 'Contact', url: '/contact' },
        ],
        footerText: '© {year} Corporate Gifts Emporium. All rights reserved.',
      }})
    }
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT update footer settings (admin only)
router.put('/', protect, async (req, res) => {
  try {
    let settings = await FooterSettings.findOne()
    
    if (!settings) {
      settings = await FooterSettings.create(req.body)
    } else {
      Object.assign(settings, req.body)
      await settings.save()
    }
    
    res.json({ success: true, data: settings })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

export default router
