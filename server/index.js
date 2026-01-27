const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const workerPool = require('./services/worker');
const transactionService = require('./services/transactionService');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;  // Changed from 3005 to 3006

// Middleware
app.use(bodyParser.json());
app.use(cors());

// ============================================================================
// RATE LIMITING FOR PASSWORD MANAGEMENT
// ============================================================================
// Store for tracking password reset requests (email -> timestamps)
const passwordResetAttempts = new Map();
const RESET_RATE_LIMIT = 5; // Max 5 requests
const RESET_RATE_WINDOW = 3600000; // Per hour (milliseconds)

function checkPasswordResetRateLimit(email) {
  const now = Date.now();
  if (!passwordResetAttempts.has(email)) {
    passwordResetAttempts.set(email, []);
  }

  const attempts = passwordResetAttempts.get(email);
  // Remove old attempts outside the time window
  const recentAttempts = attempts.filter(timestamp => now - timestamp < RESET_RATE_WINDOW);
  
  if (recentAttempts.length >= RESET_RATE_LIMIT) {
    return false; // Rate limited
  }

  recentAttempts.push(now);
  passwordResetAttempts.set(email, recentAttempts);
  return true; // Allowed
}

// API endpoints
app.get('/api/v1/transactions', async (req, res) => {
  try {
    const { page, limit, chain } = req.query;
    const transactions = await transactionService.getTransactions({
      page,
      limit,
      chain,
    });
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/transactions/count', async (req, res) => {
  try {
    const { chain } = req.query;
    const count = await transactionService.getTransactionCount(chain);
    res.json(count);
  } catch (error) {
    console.error('Error fetching transaction count:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/transactions/:transaction_id', async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const { chain } = req.query;
    const transaction = await transactionService.getTransactionById(
      transaction_id,
      chain
    );

    if (!transaction.data) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Temporary Staking Endpoint (to avoid 501 error)
app.get('/api/v1/staking/self-bonded', async (req, res) => {
  try {
    // Dummy response (until real logic added)
    res.json({
      validator: 'validator_address_example',
      selfBonded: '1000000000',
      denom: 'upokt',
      status: 'active',
    });
  } catch (error) {
    console.error('Error fetching self-bonded info:', error);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint to get chain statistics
app.get('/api/v1/chains/stats', async (req, res) => {
  try {
    const stats = await transactionService.getChainStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching chain statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint to get available chains
app.get('/api/v1/chains', (req, res) => {
  try {
    const chains = transactionService.getAvailableChains();
    res.json({ data: chains });
  } catch (error) {
    console.error('Error fetching chains:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AUTH ENDPOINTS - Following API Documentation Format
// ============================================================================

// POST /api/v1/auth/register - Register new account (Quick or Full)
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name, organization } = req.body;

    // Email validation
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Check account type based on password presence
    const isQuickRegistration = !password;

    if (!isQuickRegistration) {
      // Full Registration validation
      if (!name || typeof name !== 'string') {
        return res.status(400).json({
          error: 'Name is required when registering with a password'
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long'
        });
      }
    }

    // Generate account ID
    const accountId = Math.floor(Math.random() * 1000000) + 1;
    const now = new Date().toISOString();

    // Account data
    const accountData = {
      id: accountId,
      email: email,
      name: name || null,
      organization: organization || null,
      status: 'active',
      account_type: isQuickRegistration ? 'api_only' : 'full',
      email_verified: isQuickRegistration, // Quick reg auto-verifies
      email_verified_at: isQuickRegistration ? now : null,
      created_at: now
    };

    if (isQuickRegistration) {
      // Quick Registration - Instant token
      const tokenId = Math.floor(Math.random() * 1000000) + 1;
      const tokenValue = 'pk_live_' + Math.random().toString(36).substr(2, 42).toUpperCase();

      const tokenData = {
        id: tokenId,
        token: tokenValue,
        token_prefix: 'pk_live_' + tokenValue.substring(8, 16),
        name: 'Default Token',
        status: 'active',
        created_at: now,
        expires_at: null,
        last_used_at: null
      };

      console.log(`✓ Quick Registration: ${email}`);

      return res.status(201).json({
        data: {
          account: accountData,
          token: tokenData
        },
        message: 'Account created successfully. You can start using the API immediately with your token.',
        requiresVerification: false,
        accountType: 'api_only'
      });
    } else {
      // Full Registration - Requires email verification
      console.log(`✓ Full Registration: ${email}`);

      return res.status(201).json({
        data: {
          account: accountData
        },
        message: 'Account created successfully. A verification link has been sent to your email. Please verify your email to receive your API token.',
        requiresVerification: true,
        accountType: 'full'
      });
    }

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      error: 'Registration failed. Please try again.'
    });
  }
});

// POST /api/v1/auth/verify-email - Verify email and get token
app.post('/api/v1/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token required'
      });
    }

    // In production, verify the token and get account
    // For now, dummy response
    const now = new Date().toISOString();
    const tokenId = Math.floor(Math.random() * 1000000) + 1;
    const tokenValue = 'pk_live_' + Math.random().toString(36).substr(2, 42).toUpperCase();

    return res.status(200).json({
      data: {
        success: true,
        email: 'user@example.com',
        token: {
          id: tokenId,
          token: tokenValue,
          token_prefix: 'pk_live_' + tokenValue.substring(8, 16),
          name: 'Default Token',
          created_at: now,
          expires_at: null
        }
      },
      message: 'Email verified successfully! Your API token has been generated. Please save it - it will not be shown again.'
    });

  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({
      error: 'Email verification failed'
    });
  }
});

// POST /api/v1/auth/login - Login with email and password
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // In production, verify credentials from database
    // For now, dummy JWT tokens
    const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.' + Math.random().toString(36).substr(2);
    const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.' + Math.random().toString(36).substr(2);

    return res.status(200).json({
      data: {
        account: {
          id: 1,
          email: email,
          name: 'User Name',
          organization: null,
          status: 'active',
          email_verified: true
        },
        accessToken: accessToken,
        refreshToken: refreshToken
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Login failed'
    });
  }
});

// POST /api/v1/auth/logout - Logout
app.post('/api/v1/auth/logout', async (req, res) => {
  try {
    return res.status(200).json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Logout failed'
    });
  }
});

// ============================================================================
// PASSWORD MANAGEMENT ENDPOINTS
// ============================================================================

// POST /api/v1/auth/forgot-password - Request password reset (PUBLIC endpoint)
// Rate Limit: Maximum 5 requests per hour per account
app.post('/api/v1/auth/forgot-password', async (req, res) => {
  try {
    console.log('🔑 [Forgot Password] Endpoint called');
    const { email } = req.body;
    console.log(`📧 [Forgot Password] Email: ${email}`);

    // Validation
    if (!email || typeof email !== 'string') {
      console.log('❌ [Forgot Password] Email validation failed');
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ [Forgot Password] Invalid email format');
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Rate limit check - Maximum 5 requests per hour per email
    if (!checkPasswordResetRateLimit(email)) {
      console.log(`⏱️  [Forgot Password] Rate limit exceeded for: ${email}`);
      return res.status(429).json({
        error: 'Too many password reset requests. Please try again later.'
      });
    }

    // In production:
    // 1. Check if account exists (but always return success to prevent email enumeration)
    // 2. Generate a secure reset token (64-character hex)
    // 3. Store token with expiration (usually 1 hour)
    // 4. Send email with reset link: https://yourapp.com/reset-password?token=xxx
    
    console.log(`✓ [Forgot Password] Reset link sent to: ${email}`);

    return res.status(200).json({
      data: {
        email: email
      },
      message: 'If an account exists with this email, a password reset link has been sent. Please check your email.'
    });

  } catch (error) {
    console.error('❌ [Forgot Password] Error:', error.message);
    return res.status(500).json({
      error: 'Failed to process password reset request'
    });
  }
});

// POST /api/v1/auth/reset-password - Reset password with token (PUBLIC endpoint)
// Token from email link, validates and resets password
app.post('/api/v1/auth/reset-password', async (req, res) => {
  try {
    console.log('🔐 [Reset Password] Endpoint called');
    const { token, newPassword } = req.body;

    // Validate token format
    if (!token || typeof token !== 'string') {
      console.log('❌ [Reset Password] Token validation failed');
      return res.status(400).json({
        error: 'Invalid reset token format'
      });
    }

    if (token.length < 32) {
      console.log('❌ [Reset Password] Token too short');
      return res.status(400).json({
        error: 'Invalid reset token format'
      });
    }

    // Validate password
    if (!newPassword || typeof newPassword !== 'string') {
      console.log('❌ [Reset Password] Password validation failed');
      return res.status(400).json({
        error: 'New password is required'
      });
    }

    if (newPassword.length < 8) {
      console.log('❌ [Reset Password] Password too short');
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    // In production:
    // 1. Look up reset token in database
    // 2. Check if token exists and is not expired (usually 1 hour)
    // 3. Verify token hasn't been used already
    // 4. Get associated email
    // 5. Hash new password
    // 6. Update account password in database
    // 7. Mark token as used/expired
    // 8. Invalidate all active sessions (force re-login)
    
    // Simulate token validation
    const tokenValid = true;  // In production, check database
    const tokenExpired = false;  // In production, check expiration
    
    if (!tokenValid) {
      return res.status(400).json({
        error: 'Invalid password reset token'
      });
    }

    if (tokenExpired) {
      return res.status(400).json({
        error: 'Password reset token has expired. Please request a new one.'
      });
    }

    console.log('✓ [Reset Password] Password reset successfully');

    return res.status(200).json({
      data: {
        success: true,
        email: 'user@example.com'  // In production, get from token lookup
      },
      message: 'Password reset successfully. All active sessions have been logged out. Please login with your new password.'
    });

  } catch (error) {
    console.error('❌ [Reset Password] Error:', error.message);
    return res.status(500).json({
      error: 'Failed to reset password'
    });
  }
});

// PUT /api/v1/auth/password - Change password while logged in (PROTECTED endpoint)
// Requires JWT authentication
app.put('/api/v1/auth/password', async (req, res) => {
  try {
    console.log('🔐 [Change Password] Endpoint called');
    
    // Validate JWT token
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      console.log('❌ [Change Password] Not authenticated');
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Validate inputs
    if (!currentPassword || typeof currentPassword !== 'string') {
      console.log('❌ [Change Password] Current password missing');
      return res.status(400).json({
        error: 'Current password is required'
      });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      console.log('❌ [Change Password] New password missing');
      return res.status(400).json({
        error: 'New password is required'
      });
    }

    if (newPassword.length < 8) {
      console.log('❌ [Change Password] Password too short');
      return res.status(400).json({
        error: 'New password must be at least 8 characters long'
      });
    }

    // In production:
    // 1. Decode JWT token to get user ID
    // 2. Fetch user from database
    // 3. Verify current password matches (bcrypt compare)
    // 4. Check if account is 'full' type (not API-only)
    // 5. Verify new password is different from current
    // 6. Hash new password
    // 7. Update password in database
    // 8. Invalidate all active sessions
    // 9. Return success with email and lastPasswordChange timestamp

    const mockUserEmail = 'user@example.com';  // In production, decode from JWT
    const mockIsApiOnly = false;  // In production, check account type
    
    if (mockIsApiOnly) {
      return res.status(400).json({
        error: 'Cannot change password for API-only accounts. Please use password reset instead.'
      });
    }

    console.log(`✓ [Change Password] Password changed for: ${mockUserEmail}`);

    return res.status(200).json({
      data: {
        success: true,
        email: mockUserEmail,
        lastPasswordChange: new Date().toISOString()
      },
      message: 'Password changed successfully. All other sessions have been logged out for security.'
    });

  } catch (error) {
    console.error('❌ [Change Password] Error:', error.message);
    return res.status(500).json({
      error: 'Failed to change password'
    });
  }
});

// GET /api/v1/auth/account - Get account details (requires JWT)
app.get('/api/v1/auth/account', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    return res.status(200).json({
      data: {
        account: {
          id: 1,
          email: 'user@example.com',
          name: 'User Name',
          organization: null,
          status: 'active',
          account_type: 'full',
          email_verified: true,
          email_verified_at: new Date().toISOString(),
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch account'
    });
  }
});

// List Tokens - GET /api/v1/auth/tokens (requires JWT)
app.get('/api/v1/auth/tokens', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const tokens = [
      {
        id: 1,
        token_prefix: 'pk_live_abc123',
        name: 'Default Token',
        status: 'active',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: null,
        last_used_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    return res.status(200).json({
      data: {
        tokens: tokens
      }
    });

  } catch (error) {
    console.error('Get tokens error:', error);
    return res.status(500).json({
      error: 'Failed to fetch tokens'
    });
  }
});

// Create Token - POST /api/v1/auth/tokens (requires JWT)
app.post('/api/v1/auth/tokens', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const { name, expiresIn } = req.body;
    const tokenName = name || 'API Token';

    const tokenId = Math.floor(Math.random() * 1000000) + 1;
    const tokenValue = 'pk_live_' + Math.random().toString(36).substr(2, 42).toUpperCase();
    const now = new Date();
    const expiryDate = expiresIn ? new Date(now.getTime() + expiresIn * 24 * 60 * 60 * 1000) : null;

    const tokenData = {
      id: tokenId,
      token: tokenValue,
      token_prefix: 'pk_live_' + tokenValue.substring(8, 16),
      name: tokenName,
      created_at: now.toISOString(),
      expires_at: expiryDate ? expiryDate.toISOString() : null
    };

    return res.status(201).json({
      data: {
        token: tokenData
      },
      message: 'Token created successfully. Please save your token - it will not be shown again.'
    });

  } catch (error) {
    console.error('Create token error:', error);
    return res.status(500).json({
      error: 'Failed to create token'
    });
  }
});

// Delete Token - DELETE /api/v1/auth/tokens/:token_id (requires JWT)
app.delete('/api/v1/auth/tokens/:token_id', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const { token_id } = req.params;

    return res.status(200).json({
      data: {
        id: token_id,
        token_prefix: 'pk_live_abc123'
      },
      message: 'Token deleted successfully'
    });

  } catch (error) {
    console.error('Delete token error:', error);
    return res.status(500).json({
      error: 'Failed to delete token'
    });
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Start the server and initialize the worker pool
const startServer = async () => {
  try {
    // Initialize worker pool
    await workerPool.initialize();

    // Start the HTTP server
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await workerPool.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down server...');
      await workerPool.shutdown();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
