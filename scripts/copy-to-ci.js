/**
 * Copy Standalone Build to CodeIgniter Assets
 * 
 * This script copies the built files to your CodeIgniter application
 * Run: node scripts/copy-to-ci.js
 */

const fs = require('fs');
const path = require('path');

// Configure these paths for your CodeIgniter installation
const CI_BASE_PATH = process.env.CI_BASE_PATH || '/Users/Patrick/Sites/connected/application'; // Adjust this path
const CI_ASSETS_PATH = path.join(CI_BASE_PATH, '/Users/Patrick/Sites/connected/js/otto-equipment-mapping');

// Source paths
const SOURCE_PATH = path.join(__dirname, '../dist/standalone');
const REACT_CDN_FILES = {
  'react.production.min.js': 'https://unpkg.com/react@18/umd/react.production.min.js',
  'react-dom.production.min.js': 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
};

/**
 * Download React CDN files
 */
async function downloadReactCDN() {
  console.log('Downloading React CDN files...');
  
  for (const [filename, url] of Object.entries(REACT_CDN_FILES)) {
    const destPath = path.join(CI_ASSETS_PATH, filename);
    
    if (fs.existsSync(destPath)) {
      console.log(`  ✓ ${filename} already exists, skipping`);
      continue;
    }

    try {
      const https = require('https');
      const file = fs.createWriteStream(destPath);
      
      await new Promise((resolve, reject) => {
        https.get(url, (response) => {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`  ✓ Downloaded ${filename}`);
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });
    } catch (error) {
      console.error(`  ✗ Error downloading ${filename}:`, error.message);
    }
  }
}

/**
 * Copy built files to CodeIgniter
 */
function copyBuiltFiles() {
  console.log('\nCopying built files to CodeIgniter...');
  
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(CI_ASSETS_PATH)) {
    fs.mkdirSync(CI_ASSETS_PATH, { recursive: true });
    console.log(`  ✓ Created directory: ${CI_ASSETS_PATH}`);
  }

  // Copy all files from dist/standalone
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error('  ✗ Build directory not found. Run "npm run build:standalone" first.');
    process.exit(1);
  }

  const files = fs.readdirSync(SOURCE_PATH);
  let copiedCount = 0;

  files.forEach(file => {
    const sourcePath = path.join(SOURCE_PATH, file);
    const destPath = path.join(CI_ASSETS_PATH, file);
    
    try {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`  ✓ Copied ${file}`);
      copiedCount++;
    } catch (error) {
      console.error(`  ✗ Error copying ${file}:`, error.message);
    }
  });

  console.log(`\nSuccessfully copied ${copiedCount} file(s) to CodeIgniter!`);
}

/**
 * Create installation guide
 */
function createInstallGuide() {
  const guidePath = path.join(CI_ASSETS_PATH, 'INSTALLATION.md');
  
  const guide = `# Equipment Mapping Installation Guide

## Files Installed

The following files have been installed in your CodeIgniter application:

\`\`\`
${CI_ASSETS_PATH}/
├── react.production.min.js           # React library
├── react-dom.production.min.js       # ReactDOM library
├── equipment-mapping-bundle.js       # Main application bundle
└── vendors.js (if generated)         # Vendor dependencies
\`\`\`

## CodeIgniter Setup

### 1. Controller
Copy the controller to: \`application/controllers/Equipment_mapping.php\`

### 2. Views
Create the view at: \`application/views/equipment_mapping/dashboard.php\`

### 3. Routes (optional)
Add to \`application/config/routes.php\`:
\`\`\`php
$route['equipment-mapping'] = 'equipment_mapping/index';
$route['equipment-mapping/modal'] = 'equipment_mapping/modal_content';
$route['equipment-mapping/api/(:any)'] = 'equipment_mapping/api_proxy/$1';
\`\`\`

### 4. Environment Configuration
Add to your \`.env\` or config file:
\`\`\`
NEXTJS_API_URL=http://localhost:3000  # Your Next.js API URL
\`\`\`

### 5. Database Tables
Create the equipment mappings table:
\`\`\`sql
CREATE TABLE equipment_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    bacnet_equipment VARCHAR(255),
    cxalloy_equipment VARCHAR(255),
    tracked_points JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    INDEX idx_project (project_id)
);
\`\`\`

## Usage

1. Navigate to: \`http://yoursite.com/equipment-mapping\`
2. Click "Open Equipment Mapper" button
3. Use the interface to map equipment
4. Click "Save to Database" to persist changes

## Updating

To update the bundle after making changes:
\`\`\`bash
cd /path/to/cxalloy-equip-mapping
npm run copy:standalone
\`\`\`

## Troubleshooting

### Modal doesn't open
- Check browser console for JavaScript errors
- Verify all JS files are loaded (check Network tab)
- Ensure jQuery and Bootstrap are loaded before the bundle

### API calls fail
- Check NEXTJS_API_URL configuration
- Verify Next.js backend is running
- Check CORS settings if APIs are on different domains

### Blank screen in modal
- Open browser console and check for errors
- Verify React files are loaded correctly
- Check that \`equipment-mapping-root\` div exists

## Support

For issues or questions, refer to the main repository documentation.
`;

  fs.writeFileSync(guidePath, guide);
  console.log(`\n✓ Created installation guide at: ${guidePath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Equipment Mapping - Copy to CodeIgniter');
  console.log('='.repeat(60));
  console.log(`Source: ${SOURCE_PATH}`);
  console.log(`Destination: ${CI_ASSETS_PATH}`);
  console.log('='.repeat(60));

  try {
    // Download React CDN files
    await downloadReactCDN();

    // Copy built files
    copyBuiltFiles();

    // Create installation guide
    createInstallGuide();

    console.log('\n' + '='.repeat(60));
    console.log('✓ Installation complete!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Copy the controller and view files');
    console.log('2. Update your database schema');
    console.log('3. Configure environment variables');
    console.log(`4. Review the installation guide at: ${path.join(CI_ASSETS_PATH, 'INSTALLATION.md')}`);
    console.log('\n');

  } catch (error) {
    console.error('\n✗ Installation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, copyBuiltFiles, downloadReactCDN };
