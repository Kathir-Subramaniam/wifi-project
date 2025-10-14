# Cybersecurity Threat Model - WiFi Project

## Executive Summary

This document provides a comprehensive threat model analysis for the WiFi project, identifying potential security vulnerabilities, attack vectors, and mitigation strategies. The system consists of a React frontend, Express.js backend, PostgreSQL database, and WiFi device management capabilities.

## System Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (React/Vite)  │◄──►│  (Express.js)   │◄──►│  (PostgreSQL)   │
│   Port: 5173    │    │   Port: 3000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐            ┌─────────┐            ┌─────────┐
    │ Browser │            │  Prisma │            │   APs   │
    │  Users  │            │  Client │            │Devices  │
    └─────────┘            └─────────┘            └─────────┘
```

## Current Security Posture Assessment

### ✅ Existing Security Measures
- Environment variables properly excluded from git (.env in .gitignore)
- Prisma ORM providing SQL injection protection
- CORS enabled for cross-origin requests
- Error handling in API endpoints

### ❌ Critical Security Gaps Identified
- **No authentication/authorization system**
- **No input validation**
- **No rate limiting**
- **No HTTPS enforcement**
- **No request logging/monitoring**
- **No API versioning**
- **No environment separation (dev/prod)**

## Threat Model Analysis

### 1. STRIDE Analysis

#### 🚨 **Spoofing Threats**
| Threat | Description | Likelihood | Impact | Risk Level |
|--------|-------------|------------|---------|------------|
| **API Endpoint Spoofing** | Attackers create fake endpoints to intercept requests | Medium | High | **HIGH** |
| **Database Connection Spoofing** | Malicious actors intercept database connections | Low | Critical | **MEDIUM** |
| **Device MAC Address Spoofing** | Attackers clone legitimate device MAC addresses | High | Medium | **HIGH** |

#### 🚨 **Tampering Threats**
| Threat | Description | Likelihood | Impact | Risk Level |
|--------|-------------|------------|---------|------------|
| **API Response Manipulation** | Man-in-the-middle attacks on API responses | Medium | High | **HIGH** |
| **Database Data Tampering** | Direct database access without proper controls | Medium | Critical | **HIGH** |
| **Device Status Manipulation** | Fake device connections/disconnections | High | Medium | **HIGH** |
| **Frontend Code Injection** | XSS attacks through unvalidated inputs | Medium | High | **HIGH** |

#### 🚨 **Repudiation Threats**
| Threat | Description | Likelihood | Impact | Risk Level |
|--------|-------------|------------|---------|------------|
| **Unauthorized API Access** | No logging means actions can't be traced | High | Medium | **MEDIUM** |
| **Device Connection Logs** | No audit trail for device connections | High | Low | **LOW** |

#### 🚨 **Information Disclosure Threats**
| Threat | Description | Likelihood | Impact | Risk Level |
|--------|-------------|------------|---------|------------|
| **Database Credential Exposure** | DATABASE_URL in environment variables | Medium | Critical | **HIGH** |
| **API Response Data Leakage** | Sensitive device information exposed | High | Medium | **HIGH** |
| **Error Message Information Leakage** | Detailed error messages reveal system info | High | Low | **MEDIUM** |
| **Source Code Exposure** | Git repository may contain sensitive data | Low | High | **MEDIUM** |

#### 🚨 **Denial of Service Threats**
| Threat | Description | Likelihood | Impact | Risk Level |
|--------|-------------|------------|---------|------------|
| **API Endpoint Flooding** | No rate limiting allows DDoS attacks | High | High | **HIGH** |
| **Database Connection Exhaustion** | Unlimited database connections | Medium | Critical | **HIGH** |
| **Resource Exhaustion** | Memory/CPU exhaustion through large requests | Medium | High | **MEDIUM** |

#### 🚨 **Elevation of Privilege Threats**
| Threat | Description | Likelihood | Impact | Risk Level |
|--------|-------------|------------|---------|------------|
| **Unauthorized API Access** | No authentication allows full system access | High | Critical | **CRITICAL** |
| **Database Admin Access** | Direct database access without proper controls | Medium | Critical | **HIGH** |
| **Container/Server Privilege Escalation** | Node.js process running with elevated privileges | Low | High | **MEDIUM** |

## Attack Scenarios

### Scenario 1: Unauthorized Data Access
**Attack Path:**
1. Attacker discovers API endpoints through reconnaissance
2. Direct API calls to `/api/stats/total-devices` and `/api/stats/total-aps`
3. Access to sensitive device information without authentication
4. Potential enumeration of all devices and APs

**Impact:** Complete system compromise, data breach

### Scenario 2: Database Injection Attack
**Attack Path:**
1. Attacker finds endpoint with potential SQL injection
2. Bypasses Prisma ORM through parameter manipulation
3. Gains direct database access
4. Extracts sensitive data or modifies system state

**Impact:** Data breach, system manipulation

### Scenario 3: Man-in-the-Middle Attack
**Attack Path:**
1. Attacker intercepts HTTP traffic (no HTTPS)
2. Modifies API responses to show false device counts
3. Creates confusion in network monitoring
4. Potentially leads to incorrect network decisions

**Impact:** False data, operational disruption

### Scenario 4: Device Impersonation
**Attack Path:**
1. Attacker captures legitimate device MAC addresses
2. Spoofs MAC addresses to appear as legitimate devices
3. Connects to network while appearing as authorized device
4. Gains network access and potentially pivots to other systems

**Impact:** Unauthorized network access, lateral movement

## Vulnerability Assessment

### Critical Vulnerabilities (Fix Immediately)

#### 1. **No Authentication System**
- **Risk:** CRITICAL
- **Description:** All API endpoints are publicly accessible
- **Exploitation:** Direct API access without any authentication
- **Mitigation:** Implement JWT-based authentication

#### 2. **No Input Validation**
- **Risk:** HIGH
- **Description:** No validation on API inputs
- **Exploitation:** Injection attacks, malformed requests
- **Mitigation:** Implement input validation middleware

#### 3. **No Rate Limiting**
- **Risk:** HIGH
- **Description:** Unlimited API requests allowed
- **Exploitation:** DDoS attacks, resource exhaustion
- **Mitigation:** Implement rate limiting middleware

#### 4. **No HTTPS Enforcement**
- **Risk:** HIGH
- **Description:** All traffic transmitted in plaintext
- **Exploitation:** Man-in-the-middle attacks, data interception
- **Mitigation:** Implement HTTPS with proper certificates

### High-Risk Vulnerabilities

#### 5. **No Request Logging**
- **Risk:** HIGH
- **Description:** No audit trail for security monitoring
- **Exploitation:** Attacks go undetected
- **Mitigation:** Implement comprehensive logging

#### 6. **Error Information Disclosure**
- **Risk:** MEDIUM
- **Description:** Detailed error messages reveal system information
- **Exploitation:** Information gathering for further attacks
- **Mitigation:** Implement generic error messages

#### 7. **No Environment Separation**
- **Risk:** MEDIUM
- **Description:** Development and production use same configuration
- **Exploitation:** Development vulnerabilities in production
- **Mitigation:** Implement proper environment separation

## Recommended Security Controls

### Immediate Actions (Critical Priority)

#### 1. **Authentication & Authorization**
```javascript
// Implement JWT-based authentication
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Middleware for protected routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
```

#### 2. **Input Validation**
```javascript
const Joi = require('joi');

const validateDevice = (req, res, next) => {
  const schema = Joi.object({
    mac: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required(),
    apId: Joi.number().integer().min(1).optional()
  });
  
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};
```

#### 3. **Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

#### 4. **HTTPS Enforcement**
```javascript
const helmet = require('helmet');
const https = require('https');
const fs = require('fs');

app.use(helmet());

// HTTPS server configuration
const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(443);
```

### Medium Priority Actions

#### 5. **Request Logging & Monitoring**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
    new winston.transports.Console()
  ]
});

// Security middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});
```

#### 6. **Environment Configuration**
```javascript
// config/database.js
const config = {
  development: {
    database: process.env.DEV_DATABASE_URL,
    logging: true
  },
  production: {
    database: process.env.PROD_DATABASE_URL,
    logging: false
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

#### 7. **API Security Headers**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Long-term Security Enhancements

#### 8. **Database Security**
- Implement database connection pooling
- Use read-only database users for queries
- Enable database audit logging
- Implement database encryption at rest

#### 9. **Network Security**
- Implement VPN access for administrative functions
- Use network segmentation for database access
- Implement intrusion detection systems
- Regular network security assessments

#### 10. **Monitoring & Alerting**
- Real-time security event monitoring
- Automated threat detection
- Security incident response procedures
- Regular security training for developers

## Risk Matrix

| Vulnerability | Likelihood | Impact | Risk Level | Priority |
|---------------|------------|---------|------------|----------|
| No Authentication | High | Critical | **CRITICAL** | P0 |
| No Input Validation | Medium | High | **HIGH** | P1 |
| No Rate Limiting | High | High | **HIGH** | P1 |
| No HTTPS | Medium | High | **HIGH** | P1 |
| No Logging | High | Medium | **MEDIUM** | P2 |
| Error Disclosure | Medium | Medium | **MEDIUM** | P2 |
| No Environment Separation | Low | Medium | **MEDIUM** | P3 |

## Implementation Timeline

### Phase 1: Critical Security (Week 1-2)
- [ ] Implement JWT authentication
- [ ] Add input validation middleware
- [ ] Implement rate limiting
- [ ] Enable HTTPS

### Phase 2: Security Monitoring (Week 3-4)
- [ ] Add comprehensive logging
- [ ] Implement security headers
- [ ] Set up monitoring and alerting
- [ ] Create incident response procedures

### Phase 3: Advanced Security (Week 5-8)
- [ ] Implement database security controls
- [ ] Add network security measures
- [ ] Conduct security testing
- [ ] Create security documentation

## Compliance Considerations

### Data Protection
- **GDPR Compliance**: If handling EU data, implement proper data protection measures
- **Data Retention**: Implement policies for device data retention and deletion
- **Data Encryption**: Ensure all sensitive data is encrypted in transit and at rest

### Industry Standards
- **ISO 27001**: Implement information security management system
- **NIST Cybersecurity Framework**: Align security controls with NIST guidelines
- **OWASP Top 10**: Address common web application vulnerabilities

## Conclusion

The current WiFi project has significant security vulnerabilities that need immediate attention. The lack of authentication, input validation, and rate limiting creates a high-risk environment. Implementing the recommended security controls will significantly reduce the attack surface and protect against common threats.

**Priority Actions:**
1. Implement authentication system immediately
2. Add input validation to all endpoints
3. Enable HTTPS and rate limiting
4. Set up proper logging and monitoring

This threat model should be reviewed and updated regularly as the system evolves and new threats emerge.
