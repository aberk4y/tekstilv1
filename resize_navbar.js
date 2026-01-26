const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const viewsDir = path.join(rootDir, 'views');
const publicJsDir = path.join(rootDir, 'public', 'js');

// 1. Update layout.js (Dynamic User Menu)
const layoutJsPath = path.join(publicJsDir, 'layout.js');
if (fs.existsSync(layoutJsPath)) {
    let content = fs.readFileSync(layoutJsPath, 'utf8');
    
    // Resize dynamic user menu
    content = content.replace(/text-base font-medium hidden md:block/g, 'text-sm font-medium hidden md:block'); // Username size
    content = content.replace(/material-icons-outlined text-2xl/g, 'material-icons-outlined text-xl'); // Icons in menu
    content = content.replace(/py-4/g, 'py-3'); // Menu button padding
    
    // Dropdown items
    content = content.replace(/px-4 py-2 text-base/g, 'px-4 py-2 text-sm'); 
    
    fs.writeFileSync(layoutJsPath, content, 'utf8');
    console.log('Updated: public/js/layout.js');
}

// 2. Update HTML files (Static Navbar)
function processHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // --- Navbar Center Links ---
    // text-base -> text-sm
    content = content.replace(/class="text-base uppercase tracking-widest/g, 'class="text-sm uppercase tracking-widest');
    // spacing: space-x-8 lg:space-x-12 -> space-x-6 lg:space-x-10
    content = content.replace(/space-x-8 lg:space-x-12/g, 'space-x-6 lg:space-x-10');

    // --- Navbar Right Side ---
    // container spacing: space-x-6 -> space-x-4
    content = content.replace(/justify-end space-x-6/g, 'justify-end space-x-4');
    
    // Right side links (Cart, Language)
    // text-base -> text-sm
    // text-2xl -> text-xl
    // This part is tricky because classes are mixed. Regex needs to be reasonably specific but flexible.
    
    // Cart link
    // "text-base font-medium" -> "text-sm font-medium"
    content = content.replace(/text-base font-medium/g, 'text-sm font-medium');
    // "material-icons-outlined text-2xl" -> "material-icons-outlined text-xl"
    content = content.replace(/material-icons-outlined text-2xl/g, 'material-icons-outlined text-xl');
    
    // Lang dropdown padding
    // "py-4" -> "py-3" (only inside navbar context ideally, but py-4 is distinct enough in navbar buttons usually)
    // To be safe, we can target the language button specifcally if possible, or accept global py-4 changes in these files (likely navbar only has py-4 buttons)
    // The previous prompt identified "py-4" in the language button.
    content = content.replace(/button\s+class="flex items-center[^"]*py-4"/, (match) => {
        return match.replace('py-4', 'py-3');
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${path.relative(rootDir, filePath)}`);
    }
}

function traverseViews(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            traverseViews(fullPath);
        } else if (file.endsWith('.html')) {
            processHtmlFile(fullPath);
        }
    });
}

console.log('Starting navbar resize...');
traverseViews(viewsDir);
console.log('Navbar resize complete.');
