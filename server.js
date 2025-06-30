import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Co-browsing sessions storage
const coBrowsingSessions = new Map();
const userSessions = new Map();

// Ensure uploads directory exists
const uploadsDir = join(__dirname, 'public', 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load product data with better error handling
let productData = [];
try {
  const productDataPath = join(__dirname, 'productData.json');
  if (existsSync(productDataPath)) {
    const data = readFileSync(productDataPath, 'utf8');
    productData = JSON.parse(data);
    console.log(`✅ Successfully loaded ${productData.length} products`);
  } else {
    console.error('❌ productData.json file not found');
  }
} catch (error) {
  console.error('❌ Error loading product data:', error);
}

// Helper functions
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function analyzeImageForProducts(filename) {
  // Enhanced image analysis with more sophisticated matching
  const imageKeywords = {
    'clothing': ['shirt', 'jacket', 'sweater', 'coat', 'dress', 'pants', 'jeans'],
    'footwear': ['shoe', 'boot', 'sneaker', 'sandal', 'heel', 'loafer'],
    'accessories': ['bag', 'watch', 'jewelry', 'hat', 'sunglasses', 'belt'],
    'electronics': ['phone', 'laptop', 'headphone', 'camera', 'tablet', 'watch'],
    'home': ['furniture', 'decor', 'kitchen', 'bedroom', 'living']
  };
  
  // Return empty array if no product data available
  if (!productData || productData.length === 0) {
    return [];
  }
  
  // Simulate AI analysis - in production, use actual image recognition
  const categories = Object.keys(imageKeywords);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  
  return productData.filter(product => 
    product.category.toLowerCase().includes(randomCategory) ||
    product.subcategory.toLowerCase().includes(randomCategory)
  ).slice(0, 5);
}

function getSmartRecommendations(query, userPreferences = {}) {
  // Return empty results if no product data available
  if (!productData || productData.length === 0) {
    return { products: [], context: {} };
  }

  const lowercaseQuery = query.toLowerCase();
  let filteredProducts = [...productData];
  let context = {};

  // Advanced query analysis
  const priceKeywords = {
    budget: ['cheap', 'affordable', 'budget', 'under', 'low cost'],
    mid: ['mid-range', 'moderate', 'reasonable'],
    premium: ['premium', 'expensive', 'high-end', 'luxury', 'designer']
  };

  const seasonKeywords = {
    spring: ['spring', 'light', 'fresh'],
    summer: ['summer', 'hot', 'breathable', 'cool'],
    fall: ['fall', 'autumn', 'warm', 'cozy'],
    winter: ['winter', 'cold', 'warm', 'insulated']
  };

  // Analyze price preferences
  for (const [range, keywords] of Object.entries(priceKeywords)) {
    if (keywords.some(keyword => lowercaseQuery.includes(keyword))) {
      filteredProducts = filteredProducts.filter(p => p.priceRange === range);
      context.priceRange = range;
      break;
    }
  }

  // Analyze seasonal preferences
  for (const [season, keywords] of Object.entries(seasonKeywords)) {
    if (keywords.some(keyword => lowercaseQuery.includes(keyword))) {
      filteredProducts = filteredProducts.filter(p => p.season === season || p.season === 'all');
      context.season = season;
      break;
    }
  }

  // Category matching - improved to be more specific
  const categoryKeywords = {
    'electronics': ['electronics', 'phone', 'laptop', 'computer', 'tablet', 'headphone', 'camera'],
    'clothing': ['clothing', 'clothes', 'shirt', 'jacket', 'sweater', 'coat', 'dress', 'pants', 'jeans', 'top', 'bottom'],
    'footwear': ['footwear', 'shoes', 'shoe', 'boot', 'sneaker', 'sandal', 'heel', 'loafer'],
    'accessories': ['accessories', 'bag', 'watch', 'jewelry', 'hat', 'sunglasses', 'belt'],
    'home': ['home', 'furniture', 'decor', 'kitchen', 'bedroom', 'living'],
    'automotive': ['automotive', 'car', 'vehicle', 'auto']
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowercaseQuery.includes(keyword))) {
      filteredProducts = filteredProducts.filter(p => 
        p.category.toLowerCase().includes(category)
      );
      context.category = category;
      break;
    }
  }

  // Brand matching
  const brands = [...new Set(productData.map(p => p.brand.toLowerCase()))];
  for (const brand of brands) {
    if (lowercaseQuery.includes(brand)) {
      filteredProducts = filteredProducts.filter(p => 
        p.brand.toLowerCase() === brand
      );
      context.brand = brand;
      break;
    }
  }

  // Feature matching - if no specific filters matched, do text search
  if (filteredProducts.length === productData.length) {
    filteredProducts = productData.filter(product => 
      product.name.toLowerCase().includes(lowercaseQuery) ||
      product.description.toLowerCase().includes(lowercaseQuery) ||
      product.features.some(feature => feature.toLowerCase().includes(lowercaseQuery)) ||
      product.tags.some(tag => lowercaseQuery.includes(tag))
    );
  }

  // Sort by relevance (rating, reviews, availability)
  filteredProducts.sort((a, b) => {
    const scoreA = (a.rating * 0.4) + (Math.log(a.reviews) * 0.3) + (a.availability === 'in-stock' ? 0.3 : 0);
    const scoreB = (b.rating * 0.4) + (Math.log(b.reviews) * 0.3) + (b.availability === 'in-stock' ? 0.3 : 0);
    return scoreB - scoreA;
  });

  return { products: filteredProducts, context };
}

// Socket.IO for co-browsing
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join co-browsing session
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    
    if (!coBrowsingSessions.has(sessionId)) {
      coBrowsingSessions.set(sessionId, {
        id: sessionId,
        users: new Set(),
        currentPage: '/',
        sharedState: {}
      });
    }

    const session = coBrowsingSessions.get(sessionId);
    session.users.add(socket.id);
    userSessions.set(socket.id, sessionId);

    // Send current session state to new user
    socket.emit('session-state', {
      currentPage: session.currentPage,
      sharedState: session.sharedState,
      userCount: session.users.size
    });

    // Notify other users
    socket.to(sessionId).emit('user-joined', {
      userId: socket.id,
      userCount: session.users.size
    });
  });

  // Handle page navigation
  socket.on('navigate', (data) => {
    const sessionId = userSessions.get(socket.id);
    if (sessionId && coBrowsingSessions.has(sessionId)) {
      const session = coBrowsingSessions.get(sessionId);
      session.currentPage = data.page;
      
      // Broadcast to all users in session
      socket.to(sessionId).emit('navigate', data);
    }
  });

  // Handle scroll synchronization
  socket.on('scroll', (data) => {
    const sessionId = userSessions.get(socket.id);
    if (sessionId) {
      socket.to(sessionId).emit('scroll', data);
    }
  });

  // Handle cursor position
  socket.on('cursor-move', (data) => {
    const sessionId = userSessions.get(socket.id);
    if (sessionId) {
      socket.to(sessionId).emit('cursor-move', {
        ...data,
        userId: socket.id
      });
    }
  });

  // Handle product selection
  socket.on('product-select', (data) => {
    const sessionId = userSessions.get(socket.id);
    if (sessionId) {
      socket.to(sessionId).emit('product-select', {
        ...data,
        userId: socket.id
      });
    }
  });

  // Handle chat messages in co-browsing
  socket.on('co-browse-chat', (data) => {
    const sessionId = userSessions.get(socket.id);
    if (sessionId) {
      io.to(sessionId).emit('co-browse-chat', {
        ...data,
        userId: socket.id,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const sessionId = userSessions.get(socket.id);
    if (sessionId && coBrowsingSessions.has(sessionId)) {
      const session = coBrowsingSessions.get(sessionId);
      session.users.delete(socket.id);
      
      if (session.users.size === 0) {
        coBrowsingSessions.delete(sessionId);
      } else {
        socket.to(sessionId).emit('user-left', {
          userId: socket.id,
          userCount: session.users.size
        });
      }
    }
    
    userSessions.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

// API Endpoints

// Create co-browsing session
app.post('/api/create-session', (req, res) => {
  const sessionId = uuidv4();
  res.json({ sessionId });
});

// Enhanced chat endpoint with AI-powered responses
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context, priceRange, season, category, userPreferences } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if product data is available
    if (!productData || productData.length === 0) {
      return res.json({
        type: 'error',
        message: 'Sorry, our product catalog is currently unavailable. Please try again later.',
        suggestions: ['Check back in a few minutes', 'Contact support if the issue persists']
      });
    }

    const lowercaseMessage = message.toLowerCase();
    const { products: filteredProducts, context: queryContext } = getSmartRecommendations(message, userPreferences);
    
    let responseType = 'general';
    let specialResponse = '';
    let finalProducts = filteredProducts;

    // Enhanced query handling
    if (lowercaseMessage.includes('season') || lowercaseMessage.includes('weather')) {
      const currentSeason = getCurrentSeason();
      const seasonalProducts = filteredProducts.filter(product => 
        product.season === currentSeason || product.season === 'all'
      );
      if (seasonalProducts.length > 0) {
        finalProducts = seasonalProducts;
      }
      responseType = 'seasonal';
      specialResponse = `Perfect for ${currentSeason}! Based on current weather patterns, I recommend these ${currentSeason} essentials:`;
    }
    
    else if (lowercaseMessage.includes('trending') || lowercaseMessage.includes('popular')) {
      const trendingProducts = filteredProducts
        .sort((a, b) => (b.rating * b.reviews) - (a.rating * a.reviews))
        .slice(0, 5);
      if (trendingProducts.length > 0) {
        finalProducts = trendingProducts;
      }
      responseType = 'trending';
      specialResponse = 'Here are the most popular and trending items right now:';
    }
    
    else if (lowercaseMessage.includes('deal') || lowercaseMessage.includes('discount') || lowercaseMessage.includes('sale')) {
      const discountedProducts = filteredProducts
        .filter(product => product.discount > 0)
        .sort((a, b) => b.discount - a.discount);
      if (discountedProducts.length > 0) {
        finalProducts = discountedProducts;
      }
      responseType = 'deals';
      specialResponse = 'Great timing! Here are the best deals and discounts available:';
    }
    
    else if (lowercaseMessage.includes('gift') || lowercaseMessage.includes('present')) {
      const giftProducts = filteredProducts.filter(product => 
        product.tags.includes('gift') || product.rating >= 4.5
      );
      if (giftProducts.length > 0) {
        finalProducts = giftProducts;
      }
      responseType = 'gift';
      specialResponse = 'Perfect gift ideas! These highly-rated items make excellent presents:';
    }

    // Filter out any invalid products before proceeding
    finalProducts = finalProducts.filter(product => 
      product && 
      typeof product === 'object' && 
      product.name && 
      product.id !== undefined &&
      product.brand &&
      product.price !== undefined
    );

    // If no specific matches found, use fallback products
    if (finalProducts.length === 0) {
      finalProducts = productData
        .filter(product => 
          product && 
          typeof product === 'object' && 
          product.name && 
          product.id !== undefined &&
          product.brand &&
          product.price !== undefined
        )
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3);
      specialResponse = `I couldn't find exact matches for "${message}", but here are some highly-rated items you might love:`;
    }

    // Final safety check - ensure we have valid products before proceeding
    if (!finalProducts || finalProducts.length === 0) {
      return res.json({
        type: 'error',
        message: 'Sorry, I couldn\'t find any products to recommend at the moment. Please try a different search term.',
        suggestions: ['Try searching for "electronics"', 'Ask for "seasonal recommendations"', 'Look for "best deals"']
      });
    }

    const bestProduct = finalProducts[0];
    
    // Additional safety check for bestProduct
    if (!bestProduct || !bestProduct.name) {
      return res.json({
        type: 'error',
        message: 'Sorry, there was an issue retrieving product information. Please try again.',
        suggestions: ['Try a different search term', 'Refresh the page and try again']
      });
    }

    const alternatives = finalProducts.slice(1, 4);
    
    // Enhanced response with more context
    const response = {
      type: responseType,
      name: bestProduct.name,
      id: bestProduct.id,
      brand: bestProduct.brand,
      reason: specialResponse || `Based on your query "${message}", I recommend this ${bestProduct.subcategory ? bestProduct.subcategory.toLowerCase() : bestProduct.category.toLowerCase()} from ${bestProduct.brand}. It's perfect because of its ${bestProduct.features ? bestProduct.features.slice(0, 3).join(', ') : 'great features'}.`,
      image: bestProduct.image,
      link: `#product-${bestProduct.id}`,
      price: `$${bestProduct.price}`,
      originalPrice: bestProduct.originalPrice > bestProduct.price ? `$${bestProduct.originalPrice}` : null,
      discount: bestProduct.discount > 0 ? `${bestProduct.discount}% off` : null,
      rating: bestProduct.rating,
      reviews: bestProduct.reviews,
      features: bestProduct.features || [],
      colors: bestProduct.colors || [],
      availability: bestProduct.availability,
      shippingTime: bestProduct.shippingTime,
      warranty: bestProduct.warranty,
      alternatives: alternatives.map(product => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: `$${product.price}`,
        originalPrice: product.originalPrice > product.price ? `$${product.originalPrice}` : null,
        discount: product.discount > 0 ? `${product.discount}% off` : null,
        image: product.image,
        rating: product.rating,
        availability: product.availability
      })),
      context: queryContext
    };

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      type: 'error',
      message: 'Sorry, I encountered an error while processing your request. Please try again.',
      error: 'Internal server error' 
    });
  }
});

// Enhanced image upload with AI analysis
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Process image with sharp for optimization
    const processedImagePath = join(uploadsDir, 'processed-' + req.file.filename);
    await sharp(req.file.path)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(processedImagePath);

    // Enhanced image analysis
    const similarProducts = analyzeImageForProducts(req.file.filename);
    
    // Add confidence scores and detailed analysis
    const analysisResults = similarProducts.map(product => ({
      ...product,
      confidence: Math.random() * 0.3 + 0.7, // Simulate confidence score
      matchReason: `Similar ${product.subcategory ? product.subcategory.toLowerCase() : product.category.toLowerCase()} with matching style and features`
    }));

    res.json({
      success: true,
      filename: req.file.filename,
      processedFilename: 'processed-' + req.file.filename,
      similarProducts: analysisResults,
      message: 'Image analyzed successfully! I found these visually similar products:',
      analysisConfidence: 0.85
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Enhanced product comparison
app.post('/api/compare', (req, res) => {
  try {
    const { productIds } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 product IDs required for comparison' });
    }

    if (!productData || productData.length === 0) {
      return res.status(500).json({ error: 'Product catalog is currently unavailable' });
    }

    const products = productData.filter(product => productIds.includes(product.id));
    
    if (products.length < 2) {
      return res.status(404).json({ error: 'Products not found' });
    }

    // Enhanced comparison analysis
    const comparison = {
      products: products,
      comparison: {
        priceRange: {
          min: Math.min(...products.map(p => p.price)),
          max: Math.max(...products.map(p => p.price)),
          average: products.reduce((sum, p) => sum + p.price, 0) / products.length
        },
        avgRating: products.reduce((sum, p) => sum + p.rating, 0) / products.length,
        totalReviews: products.reduce((sum, p) => sum + p.reviews, 0),
        commonFeatures: products[0].features ? products[0].features.filter(feature => 
          products.every(product => product.features && product.features.includes(feature))
        ) : [],
        uniqueFeatures: products.map(product => ({
          id: product.id,
          name: product.name,
          unique: product.features ? product.features.filter(feature => 
            !products.every(p => p.features && p.features.includes(feature))
          ) : []
        })),
        bestValue: products.reduce((best, current) => 
          (current.rating / current.price) > (best.rating / best.price) ? current : best
        ),
        mostPopular: products.reduce((most, current) => 
          current.reviews > most.reviews ? current : most
        ),
        availability: products.map(p => ({
          id: p.id,
          name: p.name,
          status: p.availability,
          shipping: p.shippingTime
        }))
      }
    };

    res.json(comparison);
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enhanced seasonal recommendations
app.get('/api/seasonal-recommendations', (req, res) => {
  try {
    if (!productData || productData.length === 0) {
      return res.status(500).json({ error: 'Product catalog is currently unavailable' });
    }

    const currentSeason = getCurrentSeason();
    const seasonalProducts = productData.filter(product => 
      product.season === currentSeason || product.season === 'all'
    );
    
    // Enhanced seasonal logic
    const recommendations = seasonalProducts
      .sort((a, b) => {
        // Prioritize by rating, availability, and seasonal relevance
        const scoreA = (a.rating * 0.4) + (a.availability === 'in-stock' ? 0.3 : 0) + (a.season === currentSeason ? 0.3 : 0.1);
        const scoreB = (b.rating * 0.4) + (b.availability === 'in-stock' ? 0.3 : 0) + (b.season === currentSeason ? 0.3 : 0.1);
        return scoreB - scoreA;
      })
      .slice(0, 8);

    const seasonalTips = {
      spring: "Perfect time for light layers and fresh colors!",
      summer: "Stay cool with breathable fabrics and sun protection!",
      fall: "Cozy up with warm layers and rich autumn tones!",
      winter: "Bundle up with insulated gear and winter essentials!"
    };

    res.json({
      season: currentSeason,
      recommendations: recommendations,
      message: `${seasonalTips[currentSeason]} Here are our top ${currentSeason} picks:`,
      weatherTip: seasonalTips[currentSeason]
    });
  } catch (error) {
    console.error('Seasonal recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Smart search endpoint
app.get('/api/search', (req, res) => {
  try {
    if (!productData || productData.length === 0) {
      return res.status(500).json({ error: 'Product catalog is currently unavailable' });
    }

    const { q, category, priceRange, brand, sortBy, minRating } = req.query;
    let results = [...productData];

    // Apply filters
    if (q) {
      const query = q.toLowerCase();
      results = results.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        (product.tags && product.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    if (category) {
      results = results.filter(product => 
        product.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (priceRange) {
      results = results.filter(product => product.priceRange === priceRange);
    }

    if (brand) {
      results = results.filter(product => 
        product.brand.toLowerCase() === brand.toLowerCase()
      );
    }

    if (minRating) {
      results = results.filter(product => product.rating >= parseFloat(minRating));
    }

    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case 'price-low':
          results.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          results.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          results.sort((a, b) => b.rating - a.rating);
          break;
        case 'reviews':
          results.sort((a, b) => b.reviews - a.reviews);
          break;
        case 'discount':
          results.sort((a, b) => b.discount - a.discount);
          break;
        default:
          results.sort((a, b) => b.rating - a.rating);
      }
    }

    res.json({
      results: results,
      total: results.length,
      filters: {
        categories: [...new Set(productData.map(p => p.category))],
        brands: [...new Set(productData.map(p => p.brand))],
        priceRanges: [...new Set(productData.map(p => p.priceRange))]
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product recommendations based on viewing history
app.post('/api/recommendations', (req, res) => {
  try {
    if (!productData || productData.length === 0) {
      return res.status(500).json({ error: 'Product catalog is currently unavailable' });
    }

    const { viewedProducts, preferences } = req.body;
    
    let recommendations = [...productData];
    
    if (viewedProducts && viewedProducts.length > 0) {
      const viewedCategories = viewedProducts.map(id => {
        const product = productData.find(p => p.id === id);
        return product ? product.category : null;
      }).filter(Boolean);
      
      if (viewedCategories.length > 0) {
        const mostViewedCategory = viewedCategories.reduce((a, b, i, arr) =>
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        );
        
        recommendations = recommendations.filter(product => 
          product.category === mostViewedCategory && 
          !viewedProducts.includes(product.id)
        );
      }
    }
    
    // Apply user preferences
    if (preferences) {
      if (preferences.priceRange) {
        recommendations = recommendations.filter(p => p.priceRange === preferences.priceRange);
      }
      if (preferences.brands && preferences.brands.length > 0) {
        recommendations = recommendations.filter(p => preferences.brands.includes(p.brand));
      }
    }
    
    // Sort by rating and popularity
    recommendations.sort((a, b) => (b.rating * Math.log(b.reviews)) - (a.rating * Math.log(a.reviews)));
    
    res.json({
      recommendations: recommendations.slice(0, 6),
      reason: 'Based on your browsing history and preferences'
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all products with enhanced data
app.get('/api/products', (req, res) => {
  if (!productData || productData.length === 0) {
    return res.status(500).json({ error: 'Product catalog is currently unavailable' });
  }
  res.json(productData);
});

// Get product by ID
app.get('/api/products/:id', (req, res) => {
  if (!productData || productData.length === 0) {
    return res.status(500).json({ error: 'Product catalog is currently unavailable' });
  }

  const product = productData.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

server.listen(PORT, () => {
  console.log(`🚀 Enhanced AI Shopping Assistant running on http://localhost:${PORT}`);
  console.log(`📊 Loaded ${productData.length} products`);
  console.log(`🤝 Co-browsing enabled with Socket.IO`);
  
  if (productData.length === 0) {
    console.warn('⚠️  Warning: No product data loaded. Please check productData.json file.');
  }
});