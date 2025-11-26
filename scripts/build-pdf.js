import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import https from 'https';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const TYPST_DIR = path.join(ROOT_DIR, 'typst');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const INPUT_FILE = path.join(TYPST_DIR, 'cv.typ');

// Read resume.yaml to generate dynamic filename
const resumeData = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'resume.yaml'), 'utf8'));

// Generate recruiter-friendly filename: FirstName-LastName_Title_Graduate.pdf
const nameParts = resumeData.name.split(' ');
const firstName = nameParts[0];
const lastName = nameParts[nameParts.length - 1];
const title = resumeData.title.replace(/\s+/g, '-');
const fileName = `${firstName}-${lastName}_${title}_1-1_Graduate.pdf`;

const OUTPUT_FILE = path.join(PUBLIC_DIR, fileName);

// Ensure public dir exists
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

const TYPST_VERSION = '0.11.0'; // Use a fixed version
const PLATFORM = os.platform();
const ARCH = os.arch();

function getDownloadUrl() {
    const baseUrl = `https://github.com/typst/typst/releases/download/v${TYPST_VERSION}`;
    if (PLATFORM === 'linux') {
        return `${baseUrl}/typst-x86_64-unknown-linux-musl.tar.xz`;
    } else if (PLATFORM === 'darwin') {
        return `${baseUrl}/typst-aarch64-apple-darwin.tar.xz`; // Assuming M1, or check arch
    } else if (PLATFORM === 'win32') {
        return `${baseUrl}/typst-x86_64-pc-windows-msvc.zip`;
    }
    throw new Error(`Unsupported platform: ${PLATFORM}`);
}

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function installTypst() {
    const binDir = path.join(ROOT_DIR, 'bin');
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir);

    const typstPath = path.join(binDir, PLATFORM === 'win32' ? 'typst.exe' : 'typst');
    
    if (fs.existsSync(typstPath)) {
        console.log('Typst binary found in bin/');
        return typstPath;
    }

    console.log(`Typst not found. Downloading for ${PLATFORM}...`);
    const url = getDownloadUrl();
    const archiveName = 'typst_archive';
    const archivePath = path.join(binDir, archiveName);

    await downloadFile(url, archivePath);

    console.log('Extracting...');
    if (PLATFORM === 'win32') {
        // For Windows, we rely on user having it or simple unzip if possible. 
        // Since we didn't add adm-zip, let's try powershell expansion or just fail gracefully asking to install.
        // But for the VPS (Linux), we use tar.
        try {
            execSync(`powershell -command "Expand-Archive -Path '${archivePath}' -DestinationPath '${binDir}' -Force"`);
            // Move from subfolder
            const extractedFolder = fs.readdirSync(binDir).find(f => f.startsWith('typst-'));
            if (extractedFolder) {
                fs.renameSync(path.join(binDir, extractedFolder, 'typst.exe'), typstPath);
            }
        } catch (e) {
            console.error("Failed to extract on Windows. Please install Typst manually or add unzip tool.");
        }
    } else {
        execSync(`tar -xf ${archivePath} -C ${binDir}`);
        // Move from subfolder
        const extractedFolder = fs.readdirSync(binDir).find(f => f.startsWith('typst-') && fs.lstatSync(path.join(binDir, f)).isDirectory());
        if (extractedFolder) {
            fs.renameSync(path.join(binDir, extractedFolder, 'typst'), typstPath);
        }
    }
    
    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
    
    return typstPath;
}

async function build() {
    let typstCommand = 'typst';
    
    // Check if typst is in PATH
    try {
        execSync(`${typstCommand} --version`, { stdio: 'ignore' });
        console.log('Using global Typst installation.');
    } catch (e) {
        // If not in path, try to install/use local
        const localTypst = await installTypst();
        typstCommand = localTypst;
    }

    console.log('Compiling PDF...');
    try {
        // We need to run this from the root so relative paths in .typ work
        execSync(`${typstCommand} compile "${INPUT_FILE}" "${OUTPUT_FILE}" --root "${ROOT_DIR}"`, { stdio: 'inherit' });
        console.log(`PDF generated at ${OUTPUT_FILE}`);
    } catch (error) {
        console.error('Failed to compile PDF:', error);
        process.exit(1);
    }
}

build();
