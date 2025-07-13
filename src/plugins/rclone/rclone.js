import axios from 'axios';

class RcloneDownloader {
  constructor(username, password, baseUrl = 'http://localhost:5572') {
    this.username = username;
    this.password = password;
    this.baseUrl = baseUrl;
    this.authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }

  async makeRequest(endpoint, payload = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/${endpoint}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authHeader
        }
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`rclone RC API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error('No response from rclone RC server. Is rclone running?');
      } else {
        throw new Error(`Error setting up request: ${error.message}`);
      }
    }
  }

  async getCoreStats() {
    try {
      const result = await this.makeRequest('core/stats');
      return result;
    } catch (error) {
      return null;
    }
  }

  async downloadWithProgress(url, fs, remote, progressCallback) {
    console.log(`Starting download: ${url}`);
    
    const statsInterval = setInterval(async () => {
      try {
        const stats = await this.getCoreStats();
        if (stats && progressCallback) {
          progressCallback({
            stats: stats,
            finished: false
          });
        }
      } catch (error) {
        // Ignore stats errors during download
      }
    }, 1000);

    try {
      const payload = {
        url: url,
        fs: fs,
        remote: remote
      };

      const result = await this.makeRequest('operations/copyurl', payload);
      
      clearInterval(statsInterval);
      
      if (progressCallback) {
        progressCallback({
          stats: await this.getCoreStats(),
          finished: true,
          success: true
        });
      }

      return result;
    } catch (error) {
      clearInterval(statsInterval);
      
      if (progressCallback) {
        progressCallback({
          stats: await this.getCoreStats(),
          finished: true,
          success: false,
          error: error.message
        });
      }
      
      throw error;
    }
  }

  async downloadSimple(url, fs, remote) {
    const payload = {
      url: url,
      fs: fs,
      remote: remote
    };

    return await this.makeRequest('operations/copyurl', payload);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSecond) {
  return formatBytes(bytesPerSecond) + '/s';
}

const downloader = new RcloneDownloader('your_secure_username', 'your_strong_password');

const progressCallback = (progress) => {
  if (!progress.finished) {
    console.clear();
    console.log('='.repeat(50));
    console.log('DOWNLOADING...');
    
    if (progress.stats && progress.stats.transferring && progress.stats.transferring.length > 0) {
      progress.stats.transferring.forEach((transfer, index) => {
        const percent = transfer.size > 0 ? ((transfer.bytes / transfer.size) * 100).toFixed(1) : 0;
        console.log(`Transfer ${index + 1}:`);
        console.log(`  File: ${transfer.name}`);
        console.log(`  Progress: ${percent}% (${formatBytes(transfer.bytes)}/${formatBytes(transfer.size)})`);
        console.log(`  Speed: ${formatSpeed(transfer.speed || 0)}`);
        if (transfer.eta) {
          console.log(`  ETA: ${transfer.eta}`);
        }
      });
    } else {
      console.log('Preparing download...');
    }
    
    if (progress.stats && progress.stats.speed) {
      console.log(`Overall Speed: ${formatSpeed(progress.stats.speed)}`);
    }
    
    console.log('='.repeat(50));
  }
};

const url = "https://server20.dare2tease.cfd/download/Njg3MWQxOWMyNTAyMDNlZDhiMTMyMTdhLm1rdkAyYTA5OmJhYzE6MzZhMDo4MDo6MTc2OjdhQDE3NTI0MjYwNTU2MDZANUpVcnRoTEVBcXBPM0F4enRkRitBZUhWSm9tdlBsVktmVXJzbEVuRUMrbz0=/Detective.Ujjwalan.2025.1080p.DS4K.NF.WEBRip.10bit.DDP.5.1.x265.Esub-KC.mkv";
const fs = "local";
const remote = "/home/xqube/downloads/Detective.Ujjwalan.2025.1080p.DS4K.NF.WEBRip.10bit.DDP.5.1.x265.Esub-KC.mkv";

console.log('Choose download method:');
console.log('1. Download with progress monitoring');
console.log('2. Simple download (no progress)');

const method = process.argv[2] || '1';

if (method === '1') {
  downloader.downloadWithProgress(url, fs, remote, progressCallback)
    .then(result => {
      console.log('\n✅ Download completed successfully!');
      console.log('Result:', result);
    })
    .catch(error => {
      console.error('\n❌ Download failed:', error.message);
    });
} else {
  downloader.downloadSimple(url, fs, remote)
    .then(result => {
      console.log('✅ Download completed successfully!');
      console.log('Result:', result);
    })
    .catch(error => {
      console.error('❌ Download failed:', error.message);
    });
}