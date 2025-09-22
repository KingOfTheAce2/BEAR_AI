// Auto-updater server for BEAR AI Legal Assistant
// Provides update manifest and endpoints for Tauri updater

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const config = {
  updateDir: process.env.UPDATE_DIR || './releases',
  publicKey: process.env.TAURI_PUBLIC_KEY || '',
  privateKey: process.env.TAURI_PRIVATE_KEY || '',
  baseUrl: process.env.BASE_URL || 'https://api.bearai.com',
  allowedOrigins: [
    'https://bearai.com',
    'https://app.bearai.com',
    'localhost',
    '127.0.0.1'
  ]
};

// Utility functions
function generateSignature(data, privateKey) {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  return sign.sign(privateKey, 'base64');
}

function validateVersion(version) {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/.test(version);
}

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

// Release information storage
const releases = new Map();

// Load release information
function loadReleases() {
  try {
    const releasesFile = path.join(config.updateDir, 'releases.json');
    if (fs.existsSync(releasesFile)) {
      const data = JSON.parse(fs.readFileSync(releasesFile, 'utf8'));
      data.forEach(release => {
        releases.set(release.version, release);
      });
      console.log(`Loaded ${releases.size} releases`);
    }
  } catch (error) {
    console.error('Failed to load releases:', error);
  }
}

// Save release information
function saveReleases() {
  try {
    const releasesFile = path.join(config.updateDir, 'releases.json');
    const data = Array.from(releases.values());
    fs.writeFileSync(releasesFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save releases:', error);
  }
}

// Get latest release for platform
function getLatestRelease(platform = 'windows-x86_64') {
  const platformReleases = Array.from(releases.values())
    .filter(release => release.platforms && release.platforms[platform])
    .sort((a, b) => compareVersions(b.version, a.version));

  return platformReleases[0] || null;
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'BEAR AI Update Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Get update manifest (Tauri format)
app.get('/updates/latest.json', (req, res) => {
  try {
    const platform = req.query.platform || 'windows-x86_64';
    const currentVersion = req.query.current_version;

    const latestRelease = getLatestRelease(platform);

    if (!latestRelease) {
      return res.status(404).json({
        error: 'No releases available',
        platform: platform
      });
    }

    // Check if update is needed
    if (currentVersion && compareVersions(currentVersion, latestRelease.version) >= 0) {
      return res.status(204).send(); // No update needed
    }

    const platformData = latestRelease.platforms[platform];
    if (!platformData) {
      return res.status(404).json({
        error: 'Platform not supported',
        platform: platform
      });
    }

    const manifest = {
      version: latestRelease.version,
      notes: latestRelease.notes || `Update to version ${latestRelease.version}`,
      pub_date: latestRelease.pub_date || new Date().toISOString(),
      platforms: {
        [platform]: {
          signature: platformData.signature || '',
          url: platformData.url || `${config.baseUrl}/updates/download/${platform}/${latestRelease.version}`,
          with_elevated_task: platformData.with_elevated_task || false
        }
      }
    };

    res.json(manifest);
  } catch (error) {
    console.error('Error generating update manifest:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Download release file
app.get('/updates/download/:platform/:version', (req, res) => {
  try {
    const { platform, version } = req.params;

    if (!validateVersion(version)) {
      return res.status(400).json({
        error: 'Invalid version format'
      });
    }

    const release = releases.get(version);
    if (!release || !release.platforms[platform]) {
      return res.status(404).json({
        error: 'Release not found',
        platform: platform,
        version: version
      });
    }

    const platformData = release.platforms[platform];
    const filePath = path.join(config.updateDir, platformData.file);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Release file not found',
        file: platformData.file
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    res.setHeader('Content-Length', fs.statSync(filePath).size);

    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error serving download:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// List available versions
app.get('/updates/versions', (req, res) => {
  try {
    const platform = req.query.platform;

    let versionList = Array.from(releases.values())
      .map(release => ({
        version: release.version,
        pub_date: release.pub_date,
        platforms: Object.keys(release.platforms || {})
      }))
      .sort((a, b) => compareVersions(b.version, a.version));

    if (platform) {
      versionList = versionList.filter(release =>
        release.platforms.includes(platform)
      );
    }

    res.json({
      versions: versionList,
      total: versionList.length
    });

  } catch (error) {
    console.error('Error listing versions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Add new release (admin endpoint)
app.post('/updates/releases', (req, res) => {
  try {
    const {
      version,
      notes,
      platforms,
      prerelease = false
    } = req.body;

    if (!validateVersion(version)) {
      return res.status(400).json({
        error: 'Invalid version format'
      });
    }

    if (!platforms || typeof platforms !== 'object') {
      return res.status(400).json({
        error: 'Platforms configuration required'
      });
    }

    const release = {
      version,
      notes: notes || `Release ${version}`,
      pub_date: new Date().toISOString(),
      prerelease,
      platforms
    };

    releases.set(version, release);
    saveReleases();

    res.status(201).json({
      message: 'Release added successfully',
      release
    });

  } catch (error) {
    console.error('Error adding release:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get release information
app.get('/updates/releases/:version', (req, res) => {
  try {
    const { version } = req.params;

    const release = releases.get(version);
    if (!release) {
      return res.status(404).json({
        error: 'Release not found',
        version: version
      });
    }

    res.json(release);

  } catch (error) {
    console.error('Error getting release:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Update statistics endpoint
app.get('/updates/stats', (req, res) => {
  try {
    const stats = {
      total_releases: releases.size,
      platforms: {},
      latest_version: null
    };

    // Calculate platform statistics
    releases.forEach(release => {
      Object.keys(release.platforms || {}).forEach(platform => {
        stats.platforms[platform] = (stats.platforms[platform] || 0) + 1;
      });
    });

    // Get latest version
    const latest = getLatestRelease();
    if (latest) {
      stats.latest_version = latest.version;
    }

    res.json(stats);

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});

// Initialize and start server
function startServer() {
  // Ensure update directory exists
  if (!fs.existsSync(config.updateDir)) {
    fs.mkdirSync(config.updateDir, { recursive: true });
  }

  // Load existing releases
  loadReleases();

  // Start server
  app.listen(port, () => {
    console.log(`BEAR AI Update Server running on port ${port}`);
    console.log(`Update directory: ${config.updateDir}`);
    console.log(`Base URL: ${config.baseUrl}`);
    console.log(`Loaded ${releases.size} releases`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down update server...');
  saveReleases();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down update server...');
  saveReleases();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;