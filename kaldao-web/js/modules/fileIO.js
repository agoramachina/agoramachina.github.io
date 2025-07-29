// File I/O module for save/load functionality with version support
export class FileManager {
    constructor() {
        this.app = null;
    }

    init(app) {
        this.app = app;
    }

    saveParameters() {
        try {
            const saveData = {
                parameters: this.app.parameters.getState(),
                palette: {
                    currentPaletteIndex: this.app.currentPaletteIndex,
                    useColorPalette: this.app.useColorPalette,
                    invertColors: this.app.invertColors
                },
                audio: this.app.audioSystem ? this.app.audioSystem.getState() : null,
                timeAccumulation: { ...this.app.parameters.timeAccumulation },
                version: this.app.VERSION,
                timestamp: new Date().toISOString(),
                description: "Kaldao Fractal Visualizer Parameters"
            };
            
            const jsonString = JSON.stringify(saveData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `kaldao-fractal-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.app.ui.updateStatus('✅ Parameters saved to file!', 'success');
            
        } catch (error) {
            this.app.ui.updateStatus(`❌ Save failed: ${error.message}`, 'error');
        }
    }

    loadParameters() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const saveData = JSON.parse(e.target.result);
                        
                        // Validate the save data
                        if (!saveData.parameters || !saveData.palette) {
                            throw new Error('Invalid save file format');
                        }
                        
                        // Save current state for undo
                        this.app.saveStateForUndo();
                        
                        // Load parameters
                        this.app.parameters.setState(saveData.parameters);
                        
                        // Load palette settings
                        if (saveData.palette.currentPaletteIndex !== undefined) {
                            this.app.currentPaletteIndex = saveData.palette.currentPaletteIndex;
                        }
                        if (saveData.palette.useColorPalette !== undefined) {
                            this.app.useColorPalette = saveData.palette.useColorPalette;
                        }
                        if (saveData.palette.invertColors !== undefined) {
                            this.app.invertColors = saveData.palette.invertColors;
                        }
                        
                        // Load audio settings
                        if (saveData.audio && this.app.audioSystem) {
                            this.app.audioSystem.setState(saveData.audio);
                        }
                        
                        // Load time accumulation if present
                        if (saveData.timeAccumulation) {
                            Object.assign(this.app.parameters.timeAccumulation, saveData.timeAccumulation);
                        }
                        
                        this.app.ui.updateDisplay();
                        this.app.ui.updateMenuDisplay();
                        
                        const timestamp = saveData.timestamp ? 
                            new Date(saveData.timestamp).toLocaleString() : 'Unknown';
                        const version = saveData.version || 'Unknown';
                        this.app.ui.updateStatus(`✅ Parameters loaded! (v${version}, ${timestamp})`, 'success');
                        
                    } catch (error) {
                        this.app.ui.updateStatus(`❌ Load failed: ${error.message}`, 'error');
                    }
                };
                
                reader.readAsText(file);
            };
            
            input.click();
            
        } catch (error) {
            this.app.ui.updateStatus(`❌ Load failed: ${error.message}`, 'error');
        }
    }

    // Method to create and download preset files
    createPreset(name, description) {
        const presetData = {
            name: name,
            description: description,
            parameters: this.app.parameters.getState(),
            palette: {
                currentPaletteIndex: this.app.currentPaletteIndex,
                useColorPalette: this.app.useColorPalette,
                invertColors: this.app.invertColors
            },
            audio: this.app.audioSystem ? this.app.audioSystem.getState() : null,
            version: this.app.VERSION,
            timestamp: new Date().toISOString(),
            type: "preset"
        };
        
        const jsonString = JSON.stringify(presetData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `kaldao-preset-${name.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return presetData;
    }

    // Method to load a preset
    loadPreset(presetData) {
        try {
            // Save current state for undo
            this.app.saveStateForUndo();
            
            // Load preset data
            if (presetData.parameters) {
                this.app.parameters.setState(presetData.parameters);
            }
            
            if (presetData.palette) {
                if (presetData.palette.currentPaletteIndex !== undefined) {
                    this.app.currentPaletteIndex = presetData.palette.currentPaletteIndex;
                }
                if (presetData.palette.useColorPalette !== undefined) {
                    this.app.useColorPalette = presetData.palette.useColorPalette;
                }
                if (presetData.palette.invertColors !== undefined) {
                    this.app.invertColors = presetData.palette.invertColors;
                }
            }
            
            // Load audio settings
            if (presetData.audio && this.app.audioSystem) {
                this.app.audioSystem.setState(presetData.audio);
            }
            
            this.app.ui.updateDisplay();
            this.app.ui.updateMenuDisplay();
            
            return true;
        } catch (error) {
            console.error('Failed to load preset:', error);
            return false;
        }
    }

    // Export current state as URL parameters (for sharing)
    exportAsURL() {
        try {
            const state = {
                p: this.app.parameters.getState(),
                pi: this.app.currentPaletteIndex,
                ucp: this.app.useColorPalette ? 1 : 0,
                ic: this.app.invertColors ? 1 : 0,
                v: this.app.VERSION
            };
            
            const compressed = this.compressState(state);
            const url = new URL(window.location);
            url.searchParams.set('kaldao', compressed);
            
            // Copy to clipboard
            navigator.clipboard.writeText(url.toString()).then(() => {
                this.app.ui.updateStatus('🔗 URL copied to clipboard!', 'success');
            }).catch(() => {
                this.app.ui.updateStatus('🔗 URL generated (copy from address bar)', 'info');
                window.history.pushState({}, '', url);
            });
            
        } catch (error) {
            this.app.ui.updateStatus(`❌ URL export failed: ${error.message}`, 'error');
        }
    }

    // Import state from URL parameters
    importFromURL() {
        try {
            const url = new URL(window.location);
            const compressed = url.searchParams.get('kaldao');
            
            if (!compressed) return false;
            
            const state = this.decompressState(compressed);
            if (!state) return false;
            
            // Save current state for undo
            this.app.saveStateForUndo();
            
            // Apply loaded state
            if (state.p) {
                this.app.parameters.setState(state.p);
            }
            if (state.pi !== undefined) {
                this.app.currentPaletteIndex = state.pi;
            }
            if (state.ucp !== undefined) {
                this.app.useColorPalette = state.ucp === 1;
            }
            if (state.ic !== undefined) {
                this.app.invertColors = state.ic === 1;
            }
            
            this.app.ui.updateDisplay();
            this.app.ui.updateMenuDisplay();
            
            const version = state.v || 'Unknown';
            this.app.ui.updateStatus(`✅ Loaded from URL! (v${version})`, 'success');
            
            return true;
        } catch (error) {
            console.error('URL import failed:', error);
            return false;
        }
    }

    // Simple state compression for URL sharing
    compressState(state) {
        try {
            return btoa(JSON.stringify(state));
        } catch (error) {
            console.error('Compression failed:', error);
            return null;
        }
    }

    // Simple state decompression for URL sharing
    decompressState(compressed) {
        try {
            return JSON.parse(atob(compressed));
        } catch (error) {
            console.error('Decompression failed:', error);
            return null;
        }
    }
}