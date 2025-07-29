// Enhanced Color System Manager
// This module handles all color-related functionality including:
// - Three-mode color system (B&W, Original Palette, Layer Colors)
// - Advanced color menu interface
// - Color palette management and editing
// - Color mode synchronization

export class ColorManager {
    constructor() {
        this.app = null;
        
        // Advanced color menu state
        this.advancedColorMenuVisible = false;
        this.colorPreviewUpdateInterval = null;
        this.handleAdvancedColorMenuKeydown = null;
        
        // Color palette system - loaded from JSON presets
        this.colorPalettes = [];
        this.layerColorPalettes = [];
        
        // Track current palette indices
        this.currentLayerPaletteIndex = 0;
        
        // Preset loading
        this.presetsLoaded = false;
    }

    async init(app) {
        this.app = app;
        
        // Load presets from JSON files
        await this.loadPresets();
        
        // Initialize color mode based on app state
        this.syncColorModeFromLegacyFlags();
    }
    
    // Load color presets from JSON files
    async loadPresets() {
        console.log('🎨 Loading color presets from JSON files...');
        
        try {
            // Load from unified index file
            this.colorPalettes = [];
            this.layerColorPalettes = [];
            
            try {
                const indexResponse = await fetch('presets/colors/index.json');
                if (indexResponse.ok) {
                    const index = await indexResponse.json();
                    
                    // Load classic palettes
                    const classicFiles = index.classic?.presets || [];
                    for (const filename of classicFiles) {
                        try {
                            const response = await fetch(`presets/colors/classic/${filename}.json`);
                            if (response.ok) {
                                const palette = await response.json();
                                // Convert to legacy format for compatibility
                                this.colorPalettes.push({
                                    name: palette.name,
                                    a: palette.coefficients.a,
                                    b: palette.coefficients.b,
                                    c: palette.coefficients.c,
                                    d: palette.coefficients.d
                                });
                            }
                        } catch (error) {
                            console.warn(`Failed to load classic palette ${filename}:`, error);
                        }
                    }
                    
                    // Load layer palettes
                    const layerFiles = index.layers?.presets || [];
                    for (const filename of layerFiles) {
                        try {
                            const response = await fetch(`presets/colors/layers/${filename}.json`);
                            if (response.ok) {
                                const palette = await response.json();
                                this.layerColorPalettes.push({
                                    name: palette.name,
                                    colors: palette.colors
                                });
                            }
                        } catch (error) {
                            console.warn(`Failed to load layer palette ${filename}:`, error);
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to load unified index, using fallback lists:', error);
                // Fallback to hardcoded lists if index fails
                const fallbackClassicFiles = ['bw', 'rainbow', 'fire', 'ocean', 'purple', 'neon', 'sunset'];
                for (const filename of fallbackClassicFiles) {
                    try {
                        const response = await fetch(`presets/colors/classic/${filename}.json`);
                        if (response.ok) {
                            const palette = await response.json();
                            this.colorPalettes.push({
                                name: palette.name,
                                a: palette.coefficients.a,
                                b: palette.coefficients.b,
                                c: palette.coefficients.c,
                                d: palette.coefficients.d
                            });
                        }
                    } catch (error) {
                        console.warn(`Failed to load classic palette ${filename}:`, error);
                    }
                }
                
                const fallbackLayerFiles = ['default', 'sunset', 'bright', 'fire', 'moody', 'pride', 'rainbow', 'raspberry'];
                for (const filename of fallbackLayerFiles) {
                    try {
                        const response = await fetch(`presets/colors/layers/${filename}.json`);
                        if (response.ok) {
                            const palette = await response.json();
                            this.layerColorPalettes.push({
                                name: palette.name,
                                colors: palette.colors
                            });
                        }
                    } catch (error) {
                        console.warn(`Failed to load layer palette ${filename}:`, error);
                    }
                }
            }
            
            console.log(`✅ Loaded ${this.colorPalettes.length} classic palettes and ${this.layerColorPalettes.length} layer palettes`);
            this.presetsLoaded = true;
            
        } catch (error) {
            console.error('Failed to load color presets:', error);
            // Fallback to hardcoded values if loading fails
            this.loadFallbackPalettes();
        }
    }
    
    // Fallback palettes if JSON loading fails
    loadFallbackPalettes() {
        console.log('⚠️ Using fallback hardcoded palettes');
        
        this.colorPalettes = [
            { name: "B&W", a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.0, 0.0, 0.0] },
            { name: "Rainbow", a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.0, 0.33, 0.67] }
        ];
        
        this.layerColorPalettes = [
            { name: "Default", colors: ["#8E24AA", "#1976D2", "#00796B", "#388E3C"] }
        ];
        
        this.presetsLoaded = true;
    }
    
    // Sync the new color mode system with legacy flags
    syncColorModeFromLegacyFlags() {
        if (!this.app) return;
        
        if (this.app.parameters.getValue('use_layer_colors') > 0.5) {
            this.app.parameters.setValue('color_mode', 2.0); // Layer Colors
        } else if (this.app.useColorPalette) {
            this.app.parameters.setValue('color_mode', 1.0); // Original Palette
        } else {
            this.app.parameters.setValue('color_mode', 0.0); // Black & White
        }
    }

    // Get color palettes for external access
    getColorPalettes() {
        return this.colorPalettes;
    }
    
    getPalette(index) {
        return this.colorPalettes[index];
    }
    
    // Color palette randomization
    randomizePalette(index) {
        const palette = this.colorPalettes[index];
        if (palette) {
            for (let i = 0; i < 3; i++) {
                palette.a[i] = Math.random();
                palette.b[i] = Math.random();
                palette.c[i] = Math.random() * 2.0;
                palette.d[i] = Math.random();
            }
        }
    }

    // Advanced color menu functionality
    showAdvancedColorMenu() {
        if (this.advancedColorMenuVisible) {
            this.hideAdvancedColorMenu();
            return;
        }
        
        // Create menu dialog (no full-screen overlay)
        const dialog = document.createElement('div');
        dialog.id = 'advancedColorOverlay';
        // Styles are now handled in color-menu.css

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #E91E63; margin: 0; font-size: 18px;">🎨 Advanced Color Control</h2>
                <button id="advancedColorClose" style="background: #666; color: #fff; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-family: 'Courier New', monospace;">✕ Close</button>
            </div>
            
            <!-- Two Column Layout -->
            <div style="display: flex; gap: 15px; height: 80vh;">
                
                <!-- Left Column: Color Palettes + Preview -->
                <div style="flex: 0 0 380px; display: flex; flex-direction: column; gap: 12px;">
                    
                    <!-- Palette Preview Section -->
                    <div style="background: rgba(40, 40, 40, 0.2); border-radius: 6px; padding: 12px; border: 1px solid #444;">
                        <h3 style="color: #4CAF50; margin-bottom: 12px; font-size: 14px;">🌈 Live Palette Preview</h3>
                        
                        <div id="palettePreview" style="height: 80px; margin-bottom: 12px; border: 2px solid #333; border-radius: 4px; position: relative; overflow: hidden;">
                            <!-- Live color preview will be rendered here -->
                        </div>
                        
                        <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                            <button id="previewPrevPalette" style="flex: 1; padding: 6px; background: #2196F3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">← Prev</button>
                            <span id="currentPaletteIndex" style="flex: 1; text-align: center; font-size: 12px; line-height: 28px;">Black and White</span>
                            <button id="previewNextPalette" style="flex: 1; padding: 6px; background: #2196F3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Next →</button>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
                            <button id="randomizePalette" style="padding: 6px; background: #9C27B0; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">🎲 Randomize</button>
                            <button id="resetPalette" style="padding: 6px; background: #F44336; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Reset</button>
                        </div>
                    </div>
                    
                    <!-- Color Mode Controls -->
                    <div style="background: rgba(40, 40, 40, 0.2); border-radius: 6px; padding: 12px; border: 1px solid #444;">
                        <h3 style="color: #FF9800; margin-bottom: 12px; font-size: 14px;">🎛️ Color Mode</h3>
                        
                        <div style="margin-bottom: 10px;">
                            <label style="display: flex; align-items: center; font-size: 12px; margin-bottom: 6px;">
                                <input type="radio" name="colorMode" id="colorModeBlackWhite" value="0" style="margin-right: 8px;">
                                Monochrome (B&W)
                            </label>
                            
                            <label style="display: flex; align-items: center; font-size: 12px; margin-bottom: 6px;">
                                <input type="radio" name="colorMode" id="colorModeOriginal" value="1" style="margin-right: 8px;">
                                Original Palette System
                            </label>
                            
                            <label style="display: flex; align-items: center; font-size: 12px; margin-bottom: 6px;">
                                <input type="radio" name="colorMode" id="colorModeLayer" value="2" style="margin-right: 8px;">
                                Color by Layer
                            </label>
                            
                            <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #555;">
                                <label style="display: flex; align-items: center; font-size: 12px; margin-bottom: 6px;">
                                    <input type="checkbox" id="invertColors" style="margin-right: 8px;">
                                    Invert Colors
                                </label>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 10px;">
                            <label style="font-size: 11px; color: #ccc; margin-bottom: 4px; display: block;">Current Palette:</label>
                            <select id="paletteSelector" style="width: 100%; padding: 6px; background: #2a2a2a; border: 1px solid #555; color: #fff; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 11px;">
                                <!-- Options will be populated by JavaScript -->
                            </select>
                        </div>
                    </div>
                    
                    <!-- Preset Controls -->
                    <div style="background: rgba(40, 40, 40, 0.2); border-radius: 6px; padding: 12px; border: 1px solid #444;">
                        <h3 style="color: #c41b83ff; margin-bottom: 12px; font-size: 14px;">💾 Manage Colors</h3>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
                            <button id="loadColorPreset" style="padding: 6px; background: #2196F3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Load Preset</button>
                            <button id="saveColorPreset" style="padding: 6px; background: #4CAF50; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Save Preset</button>
                            <button id="resetAllPalettes" style="padding: 6px; background: #F44336; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Reset All</button>
                            <button id="randomizeAllPalettes" style="padding: 6px; background: #9C27B0; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Random All</button>
                        </div>
                    </div>
                    
                </div>
                
                <!-- Right Column: Individual Color Component Editing -->
                <div style="flex: 1; background: rgba(40, 40, 40, 0.2); border-radius: 6px; padding: 15px; border: 1px solid #444; overflow: hidden;">
                    <h3 style="color: #E91E63; margin-bottom: 15px; font-size: 14px;">🎨 Palette Component Editor</h3>
                    
                    <div style="font-size: 11px; color: #ccc; margin-bottom: 15px;">
                        Fine-tune individual color components using cosine-based color palette mathematics.
                    </div>
                    
                    <div id="colorComponentEditor" style="height: calc(100% - 80px); overflow-y: auto; padding-right: 5px;">
                        <!-- Color component controls will be populated here -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        
        this.advancedColorMenuVisible = true;
        
        // Set up event handlers
        this.setupAdvancedColorMenuHandlers(dialog);
        
        // Initialize the display
        this.updateColorPreview();
        this.populateColorComponentEditor();
        this.updateColorModeControls();
        
        // Start real-time updates
        this.startColorPreviewUpdates();
    }
    
    hideAdvancedColorMenu() {
        const overlay = document.getElementById('advancedColorOverlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
        this.advancedColorMenuVisible = false;
        this.stopColorPreviewUpdates();
    }
    
    setupAdvancedColorMenuHandlers(dialog) {
        // Close button
        const closeBtn = document.getElementById('advancedColorClose');
        if (closeBtn) {
            closeBtn.onclick = () => this.hideAdvancedColorMenu();
        }
        
        // Click outside to close
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                this.hideAdvancedColorMenu();
            }
        };
        
        // ESC key handling moved to main controls.js for better coordination
        
        // Set up color control handlers
        this.setupColorControlHandlers();
    }
    
    setupColorControlHandlers() {
        // Palette navigation
        const prevBtn = document.getElementById('previewPrevPalette');
        const nextBtn = document.getElementById('previewNextPalette');
        
        if (prevBtn) {
            prevBtn.onclick = () => {
                // Don't do anything if button is disabled (B&W mode)
                if (prevBtn.disabled) return;
                
                const colorMode = this.app.parameters.getValue('color_mode');
                if (colorMode > 1.5) { // Layer Colors mode
                    this.currentLayerPaletteIndex = Math.max(0, this.currentLayerPaletteIndex - 1);
                } else { // Original Palette mode
                    this.app.currentPaletteIndex = Math.max(0, this.app.currentPaletteIndex - 1);
                }
                this.updateColorPreview();
                this.updateColorModeControls();
                this.populateColorComponentEditor();
            };
        }
        
        if (nextBtn) {
            nextBtn.onclick = () => {
                // Don't do anything if button is disabled (B&W mode)
                if (nextBtn.disabled) return;
                
                const colorMode = this.app.parameters.getValue('color_mode');
                if (colorMode > 1.5) { // Layer Colors mode
                    this.currentLayerPaletteIndex = Math.min(this.layerColorPalettes.length - 1, this.currentLayerPaletteIndex + 1);
                } else { // Original Palette mode
                    this.app.currentPaletteIndex = Math.min(this.colorPalettes.length - 1, this.app.currentPaletteIndex + 1);
                }
                this.updateColorPreview();
                this.updateColorModeControls();
                this.populateColorComponentEditor();
            };
        }
        
        // Randomize current palette
        const randomizeBtn = document.getElementById('randomizePalette');
        if (randomizeBtn) {
            randomizeBtn.onclick = () => {
                this.randomizePalette(this.app.currentPaletteIndex);
                this.updateColorPreview();
                this.populateColorComponentEditor();
                this.app.ui.updateDisplay();
            };
        }
        
        // Reset current palette
        const resetBtn = document.getElementById('resetPalette');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.resetPalette(this.app.currentPaletteIndex);
                this.updateColorPreview();
                this.populateColorComponentEditor();
                this.app.ui.updateDisplay();
            };
        }
        
        // Color mode controls
        const colorModeRadios = document.querySelectorAll('input[name="colorMode"]');
        const invertCheckbox = document.getElementById('invertColors');
        const paletteSelector = document.getElementById('paletteSelector');
        
        // Handle color mode radio buttons
        colorModeRadios.forEach(radio => {
            radio.onchange = () => {
                if (radio.checked) {
                    const mode = parseInt(radio.value);
                    this.app.parameters.setValue('color_mode', mode);
                    
                    // Update legacy flags for compatibility
                    switch (mode) {
                        case 0: // Black & White
                            this.app.useColorPalette = false;
                            this.app.parameters.setValue('use_layer_colors', 0.0);
                            break;
                        case 1: // Original Palette
                            this.app.useColorPalette = true;
                            this.app.parameters.setValue('use_layer_colors', 0.0);
                            break;
                        case 2: // Layer Colors
                            this.app.useColorPalette = false;
                            this.app.parameters.setValue('use_layer_colors', 1.0);
                            break;
                    }
                    
                    this.app.ui.updateDisplay();
                    this.updateColorPreview();
                    this.updateColorModeControls(); // Update dropdown to show correct palette list
                    this.populateColorComponentEditor(); // Update editor interface
                }
            };
        });
        
        if (invertCheckbox) {
            invertCheckbox.onchange = () => {
                this.app.invertColors = invertCheckbox.checked;
                this.app.ui.updateDisplay();
                this.updateColorPreview();
            };
        }
        
        if (paletteSelector) {
            paletteSelector.onchange = () => {
                if (paletteSelector.value === 'new') {
                    const colorMode = this.app.parameters.getValue('color_mode');
                    if (colorMode > 1.5) {
                        this.createNewLayerPalette();
                    } else {
                        this.createNewPalette();
                    }
                    return;
                }
                
                const colorMode = this.app.parameters.getValue('color_mode');
                if (colorMode > 1.5) { // Layer Colors mode
                    this.currentLayerPaletteIndex = parseInt(paletteSelector.value);
                } else { // Original Palette mode
                    this.app.currentPaletteIndex = parseInt(paletteSelector.value);
                }
                
                this.updateColorPreview();
                this.populateColorComponentEditor();
                this.app.ui.updateDisplay();
            };
        }
        
        // Management buttons
        const resetAllBtn = document.getElementById('resetAllPalettes');
        if (resetAllBtn) {
            resetAllBtn.onclick = () => {
                if (confirm('Reset all color palettes to default values?')) {
                    this.resetAllPalettes();
                    this.updateColorPreview();
                    this.populateColorComponentEditor();
                    this.app.ui.updateDisplay();
                }
            };
        }
        
        const randomizeAllBtn = document.getElementById('randomizeAllPalettes');
        if (randomizeAllBtn) {
            randomizeAllBtn.onclick = () => {
                for (let i = 1; i < this.colorPalettes.length; i++) {
                    this.randomizePalette(i);
                }
                this.updateColorPreview();
                this.populateColorComponentEditor();
                this.app.ui.updateDisplay();
            };
        }
        
        // Load Color Preset button
        const loadPresetBtn = document.getElementById('loadColorPreset');
        if (loadPresetBtn) {
            loadPresetBtn.onclick = () => {
                this.loadColorPreset();
            };
        }
        
        // Save Color Preset button
        const savePresetBtn = document.getElementById('saveColorPreset');
        if (savePresetBtn) {
            savePresetBtn.onclick = () => {
                this.saveColorPreset();
            };
        }
    }
    
    updateColorPreview() {
        const preview = document.getElementById('palettePreview');
        const currentIndex = document.getElementById('currentPaletteIndex');
        
        if (preview && currentIndex) {
            const colorMode = this.app.parameters.getValue('color_mode');
            
            if (colorMode < 0.5) {
                // Mode 0: Black & White
                currentIndex.textContent = this.colorPalettes[this.app.currentPaletteIndex].name;
                preview.style.background = 'linear-gradient(90deg, #000000 0%, #ffffff 50%, #000000 100%)';
            } else if (colorMode < 1.5) {
                // Mode 1: Original Palette System
                currentIndex.textContent = this.colorPalettes[this.app.currentPaletteIndex].name;
                const palette = this.colorPalettes[this.app.currentPaletteIndex];
                if (palette && this.app.currentPaletteIndex > 0) {
                    // Generate color samples across the palette
                    const colors = [];
                    for (let i = 0; i < 20; i++) {
                        const t = i / 19.0;
                        const r = Math.max(0, Math.min(1, palette.a[0] + palette.b[0] * Math.cos(6.28318 * (palette.c[0] * t + palette.d[0]))));
                        const g = Math.max(0, Math.min(1, palette.a[1] + palette.b[1] * Math.cos(6.28318 * (palette.c[1] * t + palette.d[1]))));
                        const b = Math.max(0, Math.min(1, palette.a[2] + palette.b[2] * Math.cos(6.28318 * (palette.c[2] * t + palette.d[2]))));
                        
                        colors.push(`rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`);
                    }
                    
                    preview.style.background = `linear-gradient(90deg, ${colors.join(', ')})`;
                } else {
                    // Fallback to B&W if no valid palette
                    preview.style.background = 'linear-gradient(90deg, #000000 0%, #ffffff 50%, #000000 100%)';
                }
            } else {
                // Mode 2: Layer Colors
                const layerPalette = this.layerColorPalettes[this.currentLayerPaletteIndex];
                currentIndex.textContent = layerPalette ? layerPalette.name : 'Default';
                
                if (layerPalette && layerPalette.colors.length > 0) {
                    preview.style.background = `linear-gradient(90deg, ${layerPalette.colors.join(', ')})`;
                } else {
                    // Fallback to default colors
                    const defaultColors = [
                        '#8E24AA', '#1976D2', '#00796B', '#388E3C', '#F57C00', 
                        '#E64A19', '#C62828', '#AD1457', '#6A1B9A', '#4527A0', 
                        '#D32F2F', '#455A64'
                    ];
                    preview.style.background = `linear-gradient(90deg, ${defaultColors.join(', ')})`;
                }
            }
        }
    }
    
    updateColorModeControls() {
        const colorModeRadios = document.querySelectorAll('input[name="colorMode"]');
        const invertCheckbox = document.getElementById('invertColors');
        const paletteSelector = document.getElementById('paletteSelector');
        const prevBtn = document.getElementById('previewPrevPalette');
        const nextBtn = document.getElementById('previewNextPalette');
        
        // Set the correct radio button based on current color mode
        const currentMode = this.app.parameters.getValue('color_mode');
        colorModeRadios.forEach(radio => {
            radio.checked = (parseInt(radio.value) === currentMode);
        });
        
        if (invertCheckbox) {
            invertCheckbox.checked = this.app.invertColors;
        }
        
        // Disable/enable navigation controls based on color mode
        const isBlackWhiteMode = currentMode < 0.5;
        
        if (prevBtn) {
            prevBtn.disabled = isBlackWhiteMode;
            prevBtn.style.opacity = isBlackWhiteMode ? '0.3' : '1.0';
            prevBtn.style.cursor = isBlackWhiteMode ? 'not-allowed' : 'pointer';
        }
        
        if (nextBtn) {
            nextBtn.disabled = isBlackWhiteMode;
            nextBtn.style.opacity = isBlackWhiteMode ? '0.3' : '1.0';
            nextBtn.style.cursor = isBlackWhiteMode ? 'not-allowed' : 'pointer';
        }
        
        if (paletteSelector) {
            const colorMode = this.app.parameters.getValue('color_mode');
            let options = '';
            
            if (colorMode < 0.5) { // Mode 0: B&W - Lock to B&W only
                options = `<option value="0">B&W</option>`;
                paletteSelector.innerHTML = options;
                paletteSelector.value = 0;
                paletteSelector.disabled = true;
                paletteSelector.style.opacity = '0.6';
                paletteSelector.style.cursor = 'not-allowed';
            } else if (colorMode > 1.5) { // Mode 2: Layer Colors
                // Show layer color palettes
                options = this.layerColorPalettes.map((palette, index) => 
                    `<option value="${index}">${palette.name}</option>`
                ).join('');
                
                // Add "New palette..." option at the end
                options += `<option value="new">New palette...</option>`;
                
                paletteSelector.innerHTML = options;
                paletteSelector.value = this.currentLayerPaletteIndex;
                paletteSelector.disabled = false;
                paletteSelector.style.opacity = '1.0';
                paletteSelector.style.cursor = 'pointer';
            } else { // Mode 1: Original Palette
                // Show original mathematical palettes
                options = this.colorPalettes.map((palette, index) => 
                    `<option value="${index}">${palette.name}</option>`
                ).join('');
                
                // Add "New palette..." option at the end
                options += `<option value="new">New palette...</option>`;
                
                paletteSelector.innerHTML = options;
                paletteSelector.value = this.app.currentPaletteIndex;
                paletteSelector.disabled = false;
                paletteSelector.style.opacity = '1.0';
                paletteSelector.style.cursor = 'pointer';
            }
        }
    }
    
    populateColorComponentEditor() {
        const container = document.getElementById('colorComponentEditor');
        if (!container) return;
        
        const colorMode = this.app.parameters.getValue('color_mode');
        
        if (colorMode > 1.5) { // Mode 2: Layer Colors
            this.populateLayerColorEditor(container);
            return;
        }
        
        const palette = this.colorPalettes[this.app.currentPaletteIndex];
        
        // Show B&W editing only when Original Palette System is selected (mode 1)
        if (!palette || (this.app.currentPaletteIndex === 0 && colorMode < 0.5)) {
            container.innerHTML = `
                <div style="text-align: center; color: #666; font-style: italic; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚫⚪</div>
                    <div>Black & White mode selected</div>
                    <div style="font-size: 11px; margin-top: 10px;">Switch to Original Palette System mode to edit B&W values</div>
                </div>
            `;
            return;
        }
        
        const components = ['a', 'b', 'c', 'd'];
        const componentNames = ['Offset', 'Amplitude', 'Frequency', 'Phase'];
        const componentDescriptions = [
            'Base color level (brightness)',
            'Color variation intensity',
            'How fast colors cycle',
            'Color shift/rotation'
        ];
        
        container.innerHTML = components.map((component, compIndex) => `
            <div style="margin-bottom: 20px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 4px; border-left: 3px solid ${['#F44336', '#4CAF50', '#2196F3'][compIndex % 3]};">
                <h4 style="color: #fff; margin: 0 0 10px 0; font-size: 12px;">
                    ${componentNames[compIndex]} (${component.toUpperCase()})
                    <span style="color: #999; font-size: 10px; font-weight: normal; margin-left: 8px;">${componentDescriptions[compIndex]}</span>
                </h4>
                
                ${['Red', 'Green', 'Blue'].map((channel, channelIndex) => `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 11px;">
                        <span style="width: 30px; color: ${['#FF6B6B', '#4CAF50', '#64B5F6'][channelIndex]};">${channel}</span>
                        <input type="range" 
                               class="color-component-slider" 
                               data-component="${component}" 
                               data-channel="${channelIndex}"
                               min="${component === 'c' ? 0 : (component === 'a' || component === 'b' ? -1 : 0)}" 
                               max="${component === 'c' ? 4 : (component === 'a' || component === 'b' ? 1 : 1)}" 
                               step="0.01" 
                               value="${palette[component][channelIndex]}"
                               style="flex: 1;">
                        <span class="color-component-value" style="width: 40px; text-align: right; font-family: monospace;">
                            ${palette[component][channelIndex].toFixed(2)}
                        </span>
                    </div>
                `).join('')}
            </div>
        `).join('');
        
        // Set up component slider handlers
        container.querySelectorAll('.color-component-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const component = e.target.dataset.component;
                const channel = parseInt(e.target.dataset.channel);
                const value = parseFloat(e.target.value);
                
                palette[component][channel] = value;
                
                // Update displayed value
                const valueSpan = e.target.parentElement.querySelector('.color-component-value');
                if (valueSpan) {
                    valueSpan.textContent = value.toFixed(2);
                }
                
                // Update preview and main display
                this.updateColorPreview();
                this.app.ui.updateDisplay();
            });
        });
    }
    
    resetPalette(index) {
        if (index === 0) return; // Can't reset black & white palette
        
        const defaultPalettes = [
            null, // Black & white
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.0, 0.33, 0.67] }, // Default color
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.3, 0.2, 0.2] }, // Warm
            { a: [0.55, 0.4, 0.99], b: [0.208, 0.718, 0.10], c: [0.520, 0.20, 0.472], d: [0.0, 0.15, 0.15] }, // Cool
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [2.0, 1.0, 0.0], d: [0.50, 0.20, 0.25] }, // Sunset
            { a: [0.8, 0.5, 0.4], b: [0.2, 0.4, 0.2], c: [2.0, 1.0, 1.0], d: [0.0, 0.25, 0.25] }  // Earth
        ];
        
        if (defaultPalettes[index]) {
            this.colorPalettes[index] = JSON.parse(JSON.stringify(defaultPalettes[index]));
        }
    }
    
    resetAllPalettes() {
        const defaultPalettes = [
            null, // Black & white
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.0, 0.33, 0.67] },
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.3, 0.2, 0.2] },
            { a: [0.55, 0.4, 0.99], b: [0.208, 0.718, 0.10], c: [0.520, 0.20, 0.472], d: [0.0, 0.15, 0.15] },
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [2.0, 1.0, 0.0], d: [0.50, 0.20, 0.25] },
            { a: [0.8, 0.5, 0.4], b: [0.2, 0.4, 0.2], c: [2.0, 1.0, 1.0], d: [0.0, 0.25, 0.25] }
        ];
        
        defaultPalettes.forEach((palette, index) => {
            if (palette) {
                this.colorPalettes[index] = JSON.parse(JSON.stringify(palette));
            }
        });
    }
    
    startColorPreviewUpdates() {
        if (this.colorPreviewUpdateInterval) {
            clearInterval(this.colorPreviewUpdateInterval);
        }
        
        this.colorPreviewUpdateInterval = setInterval(() => {
            if (this.advancedColorMenuVisible) {
                this.updateColorPreview();
            }
        }, 100); // 10 FPS update rate
    }
    
    stopColorPreviewUpdates() {
        if (this.colorPreviewUpdateInterval) {
            clearInterval(this.colorPreviewUpdateInterval);
            this.colorPreviewUpdateInterval = null;
        }
        
        // Event listener cleanup no longer needed - handled by main controls
    }

    // Color palette state management 
    getPalettesState() {
        return JSON.parse(JSON.stringify(this.colorPalettes));
    }

    setPalettesState(palettes) {
        palettes.forEach((palette, index) => {
            if (this.colorPalettes[index]) {
                this.colorPalettes[index] = { ...palette };
            }
        });
    }
    
    // Create a new color palette
    createNewPalette() {
        const paletteName = prompt('Enter name for new palette:', `Custom ${this.colorPalettes.length}`);
        if (!paletteName) {
            // User cancelled, reset selector to current palette
            const paletteSelector = document.getElementById('paletteSelector');
            if (paletteSelector) {
                paletteSelector.value = this.app.currentPaletteIndex;
            }
            return;
        }
        
        // Create new palette with default rainbow values
        const newPalette = {
            name: paletteName,
            a: [0.5, 0.5, 0.5],
            b: [0.5, 0.5, 0.5], 
            c: [1.0, 1.0, 1.0],
            d: [0.0, 0.33, 0.67]
        };
        
        // Add to palette array
        this.colorPalettes.push(newPalette);
        
        // Switch to the new palette
        this.app.currentPaletteIndex = this.colorPalettes.length - 1;
        
        // Update displays
        this.updateColorPreview();
        this.updateColorModeControls();
        this.populateColorComponentEditor();
        this.app.ui.updateDisplay();
        
        // Show success message
        this.app.ui.updateStatus(`Created new palette: ${paletteName}`, 'success');
    }
    
    // Load color preset from file
    loadColorPreset() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const presetData = JSON.parse(event.target.result);
                    
                    // Determine preset type and validate
                    if (presetData.type === 'layer-colors') {
                        // Layer colors preset
                        if (!presetData.layerColorPalettes || !Array.isArray(presetData.layerColorPalettes)) {
                            throw new Error('Invalid layer colors preset format: missing layerColorPalettes array');
                        }
                        
                        // Load the layer palettes
                        this.layerColorPalettes = presetData.layerColorPalettes;
                        this.currentLayerPaletteIndex = 0;
                        
                        // Switch to layer colors mode if not already
                        this.app.parameters.setValue('color_mode', 2.0);
                        
                        this.app.ui.updateStatus(`Loaded layer colors preset: ${file.name}`, 'success');
                        
                    } else if (presetData.type === 'mathematical-palettes' || presetData.colorPalettes) {
                        // Mathematical palettes preset (includes legacy format)
                        const palettes = presetData.colorPalettes;
                        if (!palettes || !Array.isArray(palettes)) {
                            throw new Error('Invalid mathematical preset format: missing colorPalettes array');
                        }
                        
                        // Load the mathematical palettes
                        this.colorPalettes = palettes;
                        this.app.currentPaletteIndex = 0;
                        
                        // Switch to original palette mode if not already
                        this.app.parameters.setValue('color_mode', 1.0);
                        
                        this.app.ui.updateStatus(`Loaded mathematical color preset: ${file.name}`, 'success');
                        
                    } else {
                        throw new Error('Unknown preset format or missing type information');
                    }
                    
                    // Update displays
                    this.updateColorPreview();
                    this.updateColorModeControls();
                    this.populateColorComponentEditor();
                    this.app.ui.updateDisplay();
                    
                } catch (error) {
                    this.app.ui.updateStatus(`Failed to load preset: ${error.message}`, 'error');
                    console.error('Preset loading error:', error);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    // Save color preset to file
    saveColorPreset() {
        const colorMode = this.app.parameters.getValue('color_mode');
        
        let presetData, filename;
        
        if (colorMode > 1.5) { // Layer Colors mode
            presetData = {
                version: '1.0',
                type: 'layer-colors',
                timestamp: new Date().toISOString(),
                layerColorPalettes: this.layerColorPalettes
            };
            
            const timestamp = new Date().toISOString().split('T')[0];
            filename = `kaldao-layer-colors-preset-${timestamp}.json`;
        } else { // Original Palette mode
            presetData = {
                version: '1.0',
                type: 'mathematical-palettes',
                timestamp: new Date().toISOString(),
                colorPalettes: this.colorPalettes
            };
            
            const timestamp = new Date().toISOString().split('T')[0];
            filename = `kaldao-color-preset-${timestamp}.json`;
        }
        
        const dataStr = JSON.stringify(presetData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = filename;
        
        link.click();
        
        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
        
        const presetType = colorMode > 1.5 ? 'layer color' : 'mathematical color';
        this.app.ui.updateStatus(`${presetType} preset saved`, 'success');
    }
    
    // Layer Color System Methods
    populateLayerColorEditor(container) {
        const palette = this.layerColorPalettes[this.currentLayerPaletteIndex];
        
        if (!palette) {
            container.innerHTML = `
                <div style="text-align: center; color: #666; font-style: italic; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🎨</div>
                    <div>No layer palette selected</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h4 style="color: #E91E63; margin: 0 0 10px 0; font-size: 12px;">
                    Layer Colors: ${palette.name}
                    <span style="color: #999; font-size: 10px; font-weight: normal; margin-left: 8px;">
                        Each color represents a different depth layer
                    </span>
                </h4>
            </div>
            
            <div id="layerColorList" style="margin-bottom: 15px;">
                ${palette.colors.map((color, index) => `
                    <div class="layer-color-item" data-index="${index}" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                        <div class="color-preview" 
                             style="width: 30px; height: 30px; background: ${color}; border: 2px solid #555; border-radius: 4px; cursor: pointer;"
                             data-index="${index}"></div>
                        <input type="text" 
                               class="color-hex-input" 
                               value="${color}" 
                               data-index="${index}"
                               style="flex: 1; padding: 6px; background: #2a2a2a; border: 1px solid #555; color: #fff; border-radius: 4px; font-family: monospace; font-size: 11px;">
                        <button class="remove-color-btn" 
                                data-index="${index}"
                                style="padding: 6px 8px; background: #F44336; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">
                            ✕
                        </button>
                    </div>
                `).join('')}
            </div>
            
            <div style="display: flex; gap: 8px;">
                <button id="addLayerColor" 
                        style="flex: 1; padding: 8px; background: #4CAF50; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 11px;">
                    + Add Color
                </button>
                <button id="resetLayerColors" 
                        style="flex: 1; padding: 8px; background: #F44336; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 11px;">
                    Reset
                </button>
            </div>
        `;
        
        this.setupLayerColorEventHandlers();
    }
    
    setupLayerColorEventHandlers() {
        // Color preview squares - open color picker
        document.querySelectorAll('.color-preview').forEach(preview => {
            preview.onclick = () => {
                const index = parseInt(preview.dataset.index);
                this.openColorPicker(index);
            };
        });
        
        // Hex input fields
        document.querySelectorAll('.color-hex-input').forEach(input => {
            input.onchange = () => {
                const index = parseInt(input.dataset.index);
                const color = input.value;
                if (this.isValidHexColor(color)) {
                    this.updateLayerColor(index, color);
                } else {
                    // Revert to previous value
                    input.value = this.layerColorPalettes[this.currentLayerPaletteIndex].colors[index];
                    this.app.ui.updateStatus('Invalid hex color format', 'error');
                }
            };
        });
        
        // Remove color buttons
        document.querySelectorAll('.remove-color-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.index);
                this.removeLayerColor(index);
            };
        });
        
        // Add color button
        const addBtn = document.getElementById('addLayerColor');
        if (addBtn) {
            addBtn.onclick = () => {
                this.addLayerColor();
            };
        }
        
        // Reset colors button
        const resetBtn = document.getElementById('resetLayerColors');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.resetLayerColors();
            };
        }
    }
    
    openColorPicker(index) {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = this.layerColorPalettes[this.currentLayerPaletteIndex].colors[index];
        
        input.onchange = () => {
            this.updateLayerColor(index, input.value.toUpperCase());
        };
        
        input.click();
    }
    
    updateLayerColor(index, color) {
        this.layerColorPalettes[this.currentLayerPaletteIndex].colors[index] = color;
        this.populateColorComponentEditor();
        this.updateColorPreview();
        this.app.ui.updateDisplay();
    }
    
    addLayerColor() {
        const newColor = '#FFFFFF';
        this.layerColorPalettes[this.currentLayerPaletteIndex].colors.push(newColor);
        this.populateColorComponentEditor();
        this.updateColorPreview();
        this.app.ui.updateDisplay();
        this.app.ui.updateStatus('Added new layer color', 'success');
    }
    
    removeLayerColor(index) {
        const palette = this.layerColorPalettes[this.currentLayerPaletteIndex];
        if (palette.colors.length <= 1) {
            this.app.ui.updateStatus('Cannot remove last color', 'error');
            return;
        }
        
        palette.colors.splice(index, 1);
        this.populateColorComponentEditor();
        this.updateColorPreview();
        this.app.ui.updateDisplay();
        this.app.ui.updateStatus('Removed layer color', 'success');
    }
    
    resetLayerColors() {
        const currentName = this.layerColorPalettes[this.currentLayerPaletteIndex].name;
        
        if (currentName === 'Default') {
            this.layerColorPalettes[this.currentLayerPaletteIndex].colors = [
                "#8E24AA", "#1976D2", "#00796B", "#388E3C", "#F57C00", 
                "#E64A19", "#C62828", "#AD1457", "#6A1B9A", "#4527A0", 
                "#D32F2F", "#455A64"
            ];
        } else if (currentName === 'Sunset') {
            this.layerColorPalettes[this.currentLayerPaletteIndex].colors = [
                "#F9C80E", "#F86624", "#EA3546", "#662E9B", "#43BCCD"
            ];
        } else {
            // Custom palette - reset to a basic set
            this.layerColorPalettes[this.currentLayerPaletteIndex].colors = [
                "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"
            ];
        }
        
        this.populateColorComponentEditor();
        this.updateColorPreview();
        this.app.ui.updateDisplay();
        this.app.ui.updateStatus(`Reset ${currentName} palette colors`, 'success');
    }
    
    createNewLayerPalette() {
        const paletteName = prompt('Enter name for new layer palette:', `Custom Layer ${this.layerColorPalettes.length + 1}`);
        if (!paletteName) {
            // User cancelled, reset selector to current palette
            const paletteSelector = document.getElementById('paletteSelector');
            if (paletteSelector) {
                paletteSelector.value = this.currentLayerPaletteIndex;
            }
            return;
        }
        
        // Create new layer palette with basic colors
        const newPalette = {
            name: paletteName,
            colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF']
        };
        
        // Add to palette array
        this.layerColorPalettes.push(newPalette);
        
        // Switch to the new palette
        this.currentLayerPaletteIndex = this.layerColorPalettes.length - 1;
        
        // Update displays
        this.updateColorPreview();
        this.updateColorModeControls();
        this.populateColorComponentEditor();
        this.app.ui.updateDisplay();
        
        // Show success message
        this.app.ui.updateStatus(`Created new layer palette: ${paletteName}`, 'success');
    }
    
    isValidHexColor(hex) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
    }
}