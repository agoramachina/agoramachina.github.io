// UI management and display updates with mobile support
export class UIManager {
    constructor() {
        this.app = null;
        this.controlsVisible = true;
        this.controlsFadeTimeout = null;
        this.CONTROLS_FADE_DELAY = 3000; // 3 seconds
    }

    init(app) {
        this.app = app;
    }

    updateStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.className = type;
            statusDiv.textContent = message;
        }
    }

    updateDisplay() {
        const paramKeys = this.app.parameters.getParameterKeys();
        const paramKey = paramKeys[this.app.currentParameterIndex];
        const param = this.app.parameters.getParameter(paramKey);
        const palette = this.app.parameters.getPalette(this.app.currentPaletteIndex);
        
        const paramDiv = document.getElementById('currentParam');
        if (paramDiv) {
            paramDiv.textContent = `${param.name}: ${param.value.toFixed(3)} | ${palette.name}${this.app.invertColors ? ' (Inverted)' : ''}`;
        }
        
        // Update menu if visible
        this.updateMenuDisplay();
    }

    showControls() {
        const controls = document.getElementById('controls');
        const ui = document.getElementById('ui');
        
        if (!this.app.menuVisible) {
            // On mobile, only show UI (not controls since they're hidden via CSS)
            if (ui) {
                ui.classList.remove('hidden');
            }
            
            // On desktop, show both controls and UI
            if (controls && !this.app.isMobile) {
                controls.classList.remove('hidden');
            }
            
            this.controlsVisible = true;
            
            // Clear existing timeout
            if (this.controlsFadeTimeout) {
                clearTimeout(this.controlsFadeTimeout);
            }
            
            // Set new timeout to hide controls
            this.controlsFadeTimeout = setTimeout(() => {
                this.hideControls();
            }, this.CONTROLS_FADE_DELAY);
        }
    }
    
    hideControls() {
        const controls = document.getElementById('controls');
        const ui = document.getElementById('ui');
        
        if (!this.app.menuVisible) {
            // Hide UI on both mobile and desktop
            if (ui) {
                ui.classList.add('hidden');
            }
            
            // Hide controls on desktop (already hidden on mobile via CSS)
            if (controls && !this.app.isMobile) {
                controls.classList.add('hidden');
            }
            
            this.controlsVisible = false;
        }
    }
    
    resetControlsFadeTimer() {
        if (!this.app.menuVisible) {
            this.showControls();
        }
    }
    
    // Mobile-specific function to handle UI hiding
    resetMobileUITimer() {
        if (this.app.isMobile && !this.app.menuVisible) {
            const ui = document.getElementById('ui');
            if (ui) {
                ui.classList.remove('hidden');
                
                // Clear existing timeout
                if (this.controlsFadeTimeout) {
                    clearTimeout(this.controlsFadeTimeout);
                }
                
                // Only set timeout if user is not currently touching screen
                if (!this.app.mobile?.userIsCurrentlyTouching) {
                    this.controlsFadeTimeout = setTimeout(() => {
                        if (!this.app.menuVisible && !this.app.mobile?.userIsCurrentlyTouching) {
                            ui.classList.add('hidden');
                            // Clear status message when UI fades out
                            this.clearStatusMessage();
                        }
                    }, this.CONTROLS_FADE_DELAY);
                }
            }
        }
    }
    
    // Function to clear status message
    clearStatusMessage() {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }
    }

    toggleMenu() {
        this.app.menuVisible = !this.app.menuVisible;
        const menu = document.getElementById('menu');
        const ui = document.getElementById('ui');
        const controls = document.getElementById('controls');
        
        if (this.app.menuVisible) {
            menu.classList.remove('hidden');
            ui.classList.add('hidden');
            controls.classList.add('hidden');
            this.updateMenuDisplay();
        } else {
            menu.classList.add('hidden');
            ui.classList.remove('hidden');
            controls.classList.remove('hidden');
        }
    }

    updateMenuDisplay() {
        if (!this.app.menuVisible) return;
        
        // Generate parameters HTML
        const generateParametersHTML = () => {
            let paramsHTML = '';
            
            // Movement & Animation
            paramsHTML += '<div style="color: #4CAF50; font-weight: bold; margin-bottom: 5px;">MOVEMENT & ANIMATION</div>';
            const movementParams = ['fly_speed', 'rotation_speed', 'plane_rotation_speed', 'zoom_level', 'color_speed'];
            movementParams.forEach(key => {
                const param = this.app.parameters.getParameter(key);
                const index = this.app.parameters.getParameterKeys().indexOf(key);
                const isCurrent = index === this.app.currentParameterIndex;
                const selectionClass = isCurrent ? 'selected' : 'unselected';
                paramsHTML += `<div class="artistic-param-line ${selectionClass}" data-param-key="${key}">${param.name}: ${param.value.toFixed(3)}</div>`;
            });
            
            paramsHTML += '<br>';
            
            // Pattern & Visual
            paramsHTML += '<div style="color: #FFC107; font-weight: bold; margin-bottom: 5px;">PATTERN & VISUAL</div>';
            const patternParams = ['kaleidoscope_segments', 'truchet_radius', 'center_fill_radius', 'layer_count', 'contrast', 'color_intensity'];
            patternParams.forEach(key => {
                const param = this.app.parameters.getParameter(key);
                const index = this.app.parameters.getParameterKeys().indexOf(key);
                const isCurrent = index === this.app.currentParameterIndex;
                const selectionClass = isCurrent ? 'selected' : 'unselected';
                const value = key === 'kaleidoscope_segments' || key === 'layer_count' ? 
                    param.value.toFixed(0) : param.value.toFixed(3);
                paramsHTML += `<div class="artistic-param-line ${selectionClass}" data-param-key="${key}">${param.name}: ${value}</div>`;
            });
            
            paramsHTML += '<br>';
            
            // Camera & Path
            paramsHTML += '<div style="color: #9C27B0; font-weight: bold; margin-bottom: 5px;">CAMERA & PATH</div>';
            const cameraParams = ['camera_tilt_x', 'camera_tilt_y', 'camera_roll', 'path_stability', 'path_scale'];
            cameraParams.forEach(key => {
                const param = this.app.parameters.getParameter(key);
                const index = this.app.parameters.getParameterKeys().indexOf(key);
                const isCurrent = index === this.app.currentParameterIndex;
                const selectionClass = isCurrent ? 'selected' : 'unselected';
                paramsHTML += `<div class="artistic-param-line ${selectionClass}" data-param-key="${key}">${param.name}: ${param.value.toFixed(3)}</div>`;
            });
            
            return paramsHTML;
        };
        
        // Update desktop parameters list
        const allParamsList = document.getElementById('allParametersList');
        if (allParamsList) {
            allParamsList.innerHTML = generateParametersHTML();
            this.setupArtisticParameterInteraction();
        }
        
        // Update mobile parameters list
        const allParamsListMobile = document.getElementById('allParametersListMobile');
        if (allParamsListMobile) {
            allParamsListMobile.innerHTML = generateParametersHTML();
            this.setupArtisticParameterInteraction();
        }
        
        // Update palettes list
        const allPalettesList = document.getElementById('allPalettesList');
        if (allPalettesList) {
            let palettesHTML = '';
            const palettes = this.app.parameters.getColorPalettes();
            palettes.forEach((palette, index) => {
                const isCurrent = index === this.app.currentPaletteIndex;
                const style = isCurrent ? 'color: #4CAF50; font-weight: bold;' : 'color: #ffffff;';
                const inverted = isCurrent && this.app.invertColors ? ' (Inverted)' : '';
                const active = isCurrent && this.app.useColorPalette ? ' ●' : (isCurrent ? ' ○' : '');
                palettesHTML += `<div style="${style}">${palette.name}${inverted}${active}</div>`;
            });
            allPalettesList.innerHTML = palettesHTML;
        }
        
        // Update audio status
        const allAudioStatus = document.getElementById('allAudioStatus');
        if (allAudioStatus) {
            if (this.app.audio.microphoneActive) {
                allAudioStatus.innerHTML = '🎤 <span style="color: #4CAF50;">Microphone Active</span><br>🔊 Audio Reactive: ON<br><em>Press A to stop</em>';
            } else if (!this.app.audio.audioElement) {
                allAudioStatus.innerHTML = '🎵 No audio file loaded<br>🎤 Microphone: OFF<br>🔊 Audio Reactive: OFF<br><em>Press A for mic</em>';
            } else {
                const playStatus = this.app.audio.audioPlaying ? '<span style="color: #4CAF50;">Playing</span>' : '<span style="color: #FF9800;">Paused</span>';
                const reactiveStatus = this.app.audio.audioReactive ? '<span style="color: #4CAF50;">ON</span>' : '<span style="color: #FF9800;">OFF</span>';
                allAudioStatus.innerHTML = `🎵 File: ${playStatus}<br>🎤 Microphone: OFF<br>🔊 Audio Reactive: ${reactiveStatus}<br><em>Press A for mic</em>`;
            }
        }
    }

    // Set up click interaction for artistic parameters
    setupArtisticParameterInteraction() {
        const parameterLines = document.querySelectorAll('.artistic-param-line[data-param-key]');
        
        parameterLines.forEach(line => {
            const paramKey = line.getAttribute('data-param-key');
            
            // Click to edit parameter value
            line.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent menu from closing
                this.editArtisticParameterValue(paramKey, line);
            });
        });
    }

    // Edit artistic parameter value inline
    editArtisticParameterValue(paramKey, lineElement) {
        const param = this.app.parameters.getParameter(paramKey);
        if (!param) return;
        
        const currentValue = param.value;
        
        // Create inline editor
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentValue;
        input.min = param.min;
        input.max = param.max;
        input.step = param.step;
        input.style.cssText = `
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid #4CAF50;
            color: #ffffff;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 2px 4px;
            border-radius: 2px;
            width: 80px;
            margin-left: 10px;
        `;
        
        // Save reference to original content
        const originalContent = lineElement.innerHTML;
        
        // Replace line content with editor
        const paramName = param.name;
        lineElement.innerHTML = `${paramName}: `;
        lineElement.appendChild(input);
        
        // Focus and select all text
        input.focus();
        input.select();
        
        // Handle editing completion
        const finishEdit = () => {
            const newValue = parseFloat(input.value);
            
            if (!isNaN(newValue) && newValue >= param.min && newValue <= param.max) {
                // Save state for undo
                this.app.saveStateForUndo();
                
                // Update parameter value
                this.app.parameters.setValue(paramKey, newValue);
                
                // Update current parameter index to match edited parameter
                const index = this.app.parameters.getParameterKeys().indexOf(paramKey);
                if (index !== -1) {
                    this.app.currentParameterIndex = index;
                }
                
                // Update displays
                this.updateDisplay();
                this.updateMenuDisplay();
                
                this.updateStatus(`${param.name} set to ${newValue.toFixed(3)}`, 'success');
            } else {
                // Invalid value, revert
                lineElement.innerHTML = originalContent;
                this.updateStatus(`Invalid value for ${param.name} (range: ${param.min} to ${param.max})`, 'error');
            }
        };
        
        // Handle keyboard events
        input.addEventListener('keydown', (e) => {
            e.stopPropagation(); // Prevent app key handlers from interfering
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                lineElement.innerHTML = originalContent;
            }
        });
        
        // Handle focus loss
        input.addEventListener('blur', finishEdit);
    }
}