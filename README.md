# 🎓 UiTM Evaluation Auto-Fill Extension

**Version 2.0** - Modern UI | Enhanced Security | Full Automation

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Download-blue?logo=googlechrome)](https://chromewebstore.google.com/detail/uitm-evaluation-automatic/pdfamomgbaoabjjhjldppbnjnoigemgl)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?logo=github)](https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick)
[![Version](https://img.shields.io/badge/Version-2.0-green)](https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick/releases)

Sambungan pelayar yang akan mengisi semua soalan **SuFO**, **KIFO**, **Entrance Survey** dan **Exit Survey** UiTM secara automatik. Dengan UI yang lebih moden dan ciri automasi penuh dari dashboard!

A browser extension that automatically fills all UiTM **SuFO**, **KIFO**, **Entrance Survey** and **Exit Survey** questions. Features modern UI and full automation from the dashboard!

---

## 🚀 Quick Install / Pemasangan Cepat

### **📦 Install from Chrome Web Store (Recommended)**

**[→ Download from Chrome Web Store](https://chromewebstore.google.com/detail/uitm-evaluation-automatic/pdfamomgbaoabjjhjldppbnjnoigemgl)**

1. Click the link above
2. Click **"Add to Chrome"** / **"Tambah ke Chrome"**
3. Confirm by clicking **"Add extension"**
4. Done! Icon will appear in your toolbar

### **💻 Install from Source (Developers)**

See [Installation Guide](#-installation--cara-pemasangan) below for manual installation from source code.

---

## ✨ Features / Ciri-ciri

### 🚀 **Dashboard Automation** (NEW!)
- **Klik sekali sahaja** pada dashboard untuk memproses semua survey secara automatik
- **One-click** from dashboard to process all surveys automatically
- Automatically navigates through all incomplete entrance/exit surveys
- Returns to dashboard when complete

### 🎨 **Modern UI**
- Beautiful gradient design with Tailwind CSS
- Animated status indicators
- Smooth transitions and hover effects
- Larger, more readable interface

### 🔒 **Enhanced Security**
- Strict host permissions (only `ufuture.uitm.edu.my`)
- Content Security Policy (CSP) implementation
- No external CDN dependencies
- Secure local processing

### ⚡ **Performance**
- Lightweight custom CSS (~4KB)
- Fast loading with no external requests
- Optimized code structure
- Sequential processing to avoid rate limits

---

## 📋 How It Works / Cara Penggunaan

### **Logik Pengisian Survey:**
- **Entrance Survey & KIFO**: Pilihan **pertama** (nilai 1) - Tahap pengetahuan rendah pada peringkat awal
- **Exit Survey & SuFO**: Pilihan **terakhir** - Tahap pengetahuan/kepuasan tinggi pada akhir

### **Survey Filling Logic:**
- **Entrance Survey & KIFO**: **First** option (value 1) - Low knowledge level at start
- **Exit Survey & SuFO**: **Last** option - High knowledge/satisfaction at end

---

## 🎯 Usage Modes / Mod Penggunaan

### **1. Dashboard Mode (Recommended / Disyorkan)**
1. Navigate to `https://ufuture.uitm.edu.my/ess/dashboard/home`
2. Click the extension icon
3. Click **"Start Auto-Fill"**
4. ✨ **Magic happens!** Extension will:
   - Find all incomplete entrance/exit surveys
   - Auto-fill each survey sequentially
   - Submit automatically
   - Return to dashboard when complete

### **2. Manual Mode (Individual Survey)**
1. Open any survey page directly
2. Click the extension icon
3. Click **"Start Auto-Fill"**
4. Survey will be filled and submitted

---

## 📥 Installation / Cara Pemasangan

### **Method 1: Chrome Web Store (Recommended / Disyorkan)**

**[Install from Chrome Web Store](https://chromewebstore.google.com/detail/uitm-evaluation-automatic/pdfamomgbaoabjjhjldppbnjnoigemgl)**

✅ Easiest installation
✅ Automatic updates
✅ One-click install
✅ Works on Chrome, Edge, Brave

### **Method 2: Manual Installation (For Developers)**

**Only use this if you want to modify the code or test development versions.**

1. **Download Source Code**
   - Click **Code** → **Download ZIP** on GitHub
   - Extract the ZIP file to a folder

2. **Enable Developer Mode**
   - Go to `chrome://extensions/` (or `edge://extensions/`)
   - Enable **Developer mode** (toggle at top-right)

3. **Load Extension**
   - Click **Load unpacked** / **Muat sambungan yang tidak dibungkus**
   - Select the extracted folder

4. **Done! / Selesai!**
   - Extension icon will appear in toolbar
   - Pin the icon for easy access

**Note:** Manual installations won't receive automatic updates.

---

## 🛠️ Technical Details / Butiran Teknikal

### **Files Structure:**
```
Ufuture Extension/
├── manifest.json       # Extension configuration
├── index.html          # Popup UI
├── index.js           # Main logic & popup handler
├── content.js         # Auto-fill automation script
├── tailwind.css       # UI styling utilities
├── style.css          # Custom animations & effects
└── icon128.png        # Extension icon
```

### **Technologies:**
- **Manifest V3** - Latest Chrome extension standard
- **Tailwind CSS** - Modern utility-first styling
- **Vanilla JavaScript** - No dependencies
- **Content Scripts** - Automatic survey detection

### **Permissions:**
- `scripting` - To inject auto-fill scripts
- `activeTab` - To access current tab
- `host_permissions` - Only for `ufuture.uitm.edu.my`

---

## 📸 Screenshots / Tangkapan Skrin

**Modern UI:**
- Gradient background (blue to indigo)
- Large, readable buttons
- Status indicators with icons
- Smooth animations

**Dashboard Automation:**
- Automatically processes all surveys
- No manual clicking required
- Returns to dashboard when done

---

## ⚠️ Important Notes / Nota Penting

- Extension **ONLY works** on `ufuture.uitm.edu.my` domain for security
- Currently focuses on **Entrance & Exit Surveys** (SuFO/KIFO support coming soon)
- Keep the tab active while processing
- Do not close the tab until all surveys are complete
- Check console (F12) for detailed logs if needed

---

## 🐛 Troubleshooting / Penyelesaian Masalah

**Extension doesn't work?**
1. Make sure you're on the correct UiTM domain
2. Reload the extension in `chrome://extensions/`
3. Hard refresh the page (Ctrl + Shift + R)
4. Check browser console for errors (F12)

**Surveys not auto-processing?**
1. Ensure you clicked from the dashboard page
2. Check if surveys are marked as "Not Taken Yet"
3. Keep the tab active (don't switch tabs)

---

## 📝 Changelog

### **Version 2.0** (Current)
- ✅ Complete UI redesign with Tailwind CSS
- ✅ Dashboard automation mode
- ✅ Sequential survey processing
- ✅ Enhanced security with strict CSP
- ✅ Performance optimizations
- ✅ Improved error handling

### **Version 1.2** (Legacy)
- Basic auto-fill functionality
- Bootstrap UI
- Manual survey filling only

---

## 👨‍💻 Developer / Pembangun

**Original Author:** UNIVERSE
**Updated by:** Claude Code AI Assistant
**Version:** 2.0
**Last Updated:** October 2025

## 🔗 Links / Pautan

- **Chrome Web Store:** [Install Extension](https://chromewebstore.google.com/detail/uitm-evaluation-automatic/pdfamomgbaoabjjhjldppbnjnoigemgl)
- **GitHub Repository:** [Source Code](https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick)
- **Report Issues:** [GitHub Issues](https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick/issues)
- **Privacy Policy:** [View Policy](https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick/blob/main/PRIVACY_POLICY.md)

---

## 📄 License / Lesen

This extension is for **educational purposes only**. Use responsibly and in accordance with UiTM's policies.

Sambungan ini adalah untuk **tujuan pendidikan sahaja**. Gunakan dengan bertanggungjawab dan mengikut dasar UiTM.

---

## 🙏 Disclaimer / Penafian

This tool automates form filling to save time. Users are responsible for ensuring the accuracy of their responses. The developers are not responsible for any misuse or consequences.

Alat ini mengautomasikan pengisian borang untuk menjimatkan masa. Pengguna bertanggungjawab memastikan ketepatan jawapan mereka. Pembangun tidak bertanggungjawab atas sebarang penyalahgunaan atau akibat.

---

## 💫 Get Started Now!

**[→ Install from Chrome Web Store](https://chromewebstore.google.com/detail/uitm-evaluation-automatic/pdfamomgbaoabjjhjldppbnjnoigemgl)**

**🚀 Enjoy hassle-free survey completion! / Nikmati pengisian survey tanpa kerumitan!**

---

*Made with ❤️ for UiTM students*
