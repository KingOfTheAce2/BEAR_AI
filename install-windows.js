// BEAR AI Legal Assistant - Windows Script Host Installer
// Run with: cscript install-windows.js or double-click to run

var fso = new ActiveXObject("Scripting.FileSystemObject");
var shell = new ActiveXObject("WScript.Shell");
var http = new ActiveXObject("WinHttp.WinHttpRequest.5.1");

// Configuration
var REPO_ZIP_URL = "https://github.com/KingOfTheAce2/BEAR_AI/archive/refs/heads/main.zip";
var INSTALL_DIR_NAME = "BEAR_AI";
var homeDir = shell.ExpandEnvironmentStrings("%USERPROFILE%");
var installDir = homeDir + "\\" + INSTALL_DIR_NAME;

function log(message) {
    WScript.Echo(message);
}

function success(message) {
    WScript.Echo("✅ " + message);
}

function error(message) {
    WScript.Echo("❌ " + message);
}

function info(message) {
    WScript.Echo("ℹ️  " + message);
}

function showWelcome() {
    log("");
    log("╔═══════════════════════════════════════════════════════════════╗");
    log("║                                                               ║");
    log("║   🐻  BEAR AI Legal Assistant - Windows Installer  ⚖️        ║");
    log("║                                                               ║");
    log("║   Simple Windows installation for BEAR AI                    ║");
    log("║   Professional Legal AI Assistant                            ║");
    log("║                                                               ║");
    log("╚═══════════════════════════════════════════════════════════════╝");
    log("");
    log("What this installer does:");
    log("• Downloads the latest BEAR AI from GitHub");
    log("• Extracts to your home directory"); 
    log("• Sets up basic configuration");
    log("• Creates shortcuts for easy access");
    log("");
    log("Installation directory: " + installDir);
    log("");
    
    if (fso.FolderExists(installDir)) {
        log("⚠️  Directory already exists. This will update your installation.");
    }
}

function checkPrerequisites() {
    info("Checking system compatibility...");
    
    // Check if we can create directories
    try {
        if (!fso.FolderExists(installDir)) {
            fso.CreateFolder(installDir);
            success("Directory creation - OK");
        } else {
            success("Installation directory - Found");
        }
    } catch(e) {
        error("Cannot create installation directory: " + e.message);
        WScript.Quit(1);
    }
    
    // Check internet connection
    try {
        http.Open("HEAD", "https://github.com", false);
        http.Send();
        if (http.Status == 200 || http.Status == 301 || http.Status == 302) {
            success("Internet connection - Available");
        } else {
            error("Cannot connect to GitHub");
            WScript.Quit(1);
        }
    } catch(e) {
        error("Internet connection test failed: " + e.message);
        WScript.Quit(1);
    }
}

function downloadBearAI() {
    info("Downloading BEAR AI Legal Assistant...");
    
    var zipPath = installDir + "\\bear-ai.zip";
    
    try {
        // Download the ZIP file
        http.Open("GET", REPO_ZIP_URL, false);
        http.Send();
        
        if (http.Status == 200) {
            // Save to file
            var stream = new ActiveXObject("ADODB.Stream");
            stream.Type = 1; // Binary
            stream.Open();
            stream.Write(http.ResponseBody);
            stream.SaveToFile(zipPath, 2); // Overwrite
            stream.Close();
            
            success("BEAR AI downloaded successfully");
        } else {
            error("Failed to download BEAR AI. HTTP Status: " + http.Status);
            WScript.Quit(1);
        }
    } catch(e) {
        error("Download failed: " + e.message);
        WScript.Quit(1);
    }
    
    // Extract the ZIP file
    info("Extracting files...");
    try {
        var shellApp = new ActiveXObject("Shell.Application");
        var zipFile = shellApp.NameSpace(zipPath);
        var destination = shellApp.NameSpace(installDir);
        
        // Extract all items
        destination.CopyHere(zipFile.Items(), 4 + 16); // No dialog + Yes to all
        
        // Move files from subdirectory
        var extractedDir = installDir + "\\BEAR_AI-main";
        if (fso.FolderExists(extractedDir)) {
            moveContents(extractedDir, installDir);
            fso.DeleteFolder(extractedDir, true);
        }
        
        // Clean up ZIP file
        fso.DeleteFile(zipPath);
        
        success("Files extracted successfully");
    } catch(e) {
        error("Extraction failed: " + e.message);
        WScript.Quit(1);
    }
}

function moveContents(source, destination) {
    var sourceFolder = fso.GetFolder(source);
    var files = new Enumerator(sourceFolder.Files);
    var folders = new Enumerator(sourceFolder.SubFolders);
    
    // Move files
    for (; !files.atEnd(); files.moveNext()) {
        var file = files.item();
        var destPath = destination + "\\" + file.Name;
        if (fso.FileExists(destPath)) {
            fso.DeleteFile(destPath);
        }
        file.Move(destPath);
    }
    
    // Move folders
    for (; !folders.atEnd(); folders.moveNext()) {
        var folder = folders.item();
        var destPath = destination + "\\" + folder.Name;
        if (fso.FolderExists(destPath)) {
            fso.DeleteFolder(destPath, true);
        }
        folder.Move(destPath);
    }
}

function setupEnvironment() {
    info("Setting up environment...");
    
    try {
        // Create basic directories
        var dirs = ["logs", "temp", "config"];
        for (var i = 0; i < dirs.length; i++) {
            var dirPath = installDir + "\\" + dirs[i];
            if (!fso.FolderExists(dirPath)) {
                fso.CreateFolder(dirPath);
            }
        }
        
        // Create basic config file
        var configPath = installDir + "\\config\\bear-ai.json";
        var now = new Date();
        var config = {
            "version": "2.0.0",
            "installDate": now.getFullYear() + "-" + (now.getMonth()+1) + "-" + now.getDate() + " " + now.getHours() + ":" + now.getMinutes(),
            "platform": "win32",
            "installedBy": "windows-script-installer"
        };
        
        var configFile = fso.CreateTextFile(configPath, true);
        configFile.WriteLine(JSON.stringify(config, null, 2));
        configFile.Close();
        
        success("Environment setup completed");
    } catch(e) {
        error("Environment setup failed: " + e.message);
    }
}

function createShortcuts() {
    info("Creating shortcuts...");
    
    try {
        var desktopPath = shell.SpecialFolders("Desktop");
        var shortcutPath = desktopPath + "\\BEAR AI Legal Assistant.lnk";
        
        // Create shortcut to the installation directory
        var shortcut = shell.CreateShortcut(shortcutPath);
        shortcut.TargetPath = installDir;
        shortcut.WorkingDirectory = installDir;
        shortcut.Description = "BEAR AI Legal Assistant";
        shortcut.Save();
        
        success("Desktop shortcut created");
    } catch(e) {
        error("Shortcut creation failed: " + e.message);
    }
}

function verifyInstallation() {
    info("Verifying installation...");
    
    var checks = [
        {name: "Package file", path: installDir + "\\package.json"},
        {name: "Source directory", path: installDir + "\\src"},
        {name: "Documentation", path: installDir + "\\docs"},
        {name: "Configuration", path: installDir + "\\config\\bear-ai.json"}
    ];
    
    var passed = 0;
    for (var i = 0; i < checks.length; i++) {
        var check = checks[i];
        if (fso.FileExists(check.path) || fso.FolderExists(check.path)) {
            success(check.name + " - OK");
            passed++;
        } else {
            error(check.name + " - Missing");
        }
    }
    
    if (passed >= 3) {
        success("Installation verified (" + passed + "/" + checks.length + " checks passed)");
    } else {
        error("Installation may have issues (" + passed + "/" + checks.length + " checks passed)");
    }
}

function showSuccess() {
    log("");
    log("╔══════════════════════════════════════════════════════════════════╗");
    log("║                     INSTALLATION COMPLETE!                      ║");
    log("╠══════════════════════════════════════════════════════════════════╣");
    log("║                                                                  ║");
    log("║  🎉 BEAR AI Legal Assistant has been installed successfully!     ║");
    log("║                                                                  ║");
    log("║  Installation directory: " + installDir.substring(0, 30) + "...           ║");
    log("║                                                                  ║");
    log("╚══════════════════════════════════════════════════════════════════╝");
    log("");
    log("🚀 Next Steps:");
    log("1. Install Node.js from https://nodejs.org (if not already installed)");
    log("2. Open Command Prompt or PowerShell");
    log("3. Navigate to: " + installDir);
    log("4. Run: npm install");
    log("5. Start BEAR AI: npm start");
    log("");
    log("📚 What's Included:");
    log("• Desktop shortcut to BEAR AI folder");
    log("• Complete source code and documentation");
    log("• Configuration files");
    log("");
    log("🆘 Need Help?");
    log("• Documentation: " + installDir + "\\docs\\");
    log("• Issues: https://github.com/KingOfTheAce2/BEAR_AI/issues");
    log("");
    log("Thank you for choosing BEAR AI! 🐻⚖️");
}

// Main installation function
function main() {
    showWelcome();
    checkPrerequisites();
    downloadBearAI();
    setupEnvironment();
    createShortcuts();
    verifyInstallation();
    showSuccess();
}

// Run the installer
try {
    main();
} catch(e) {
    error("Installation failed: " + e.message);
    WScript.Quit(1);
}