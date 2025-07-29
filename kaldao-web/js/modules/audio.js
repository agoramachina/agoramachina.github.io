// Audio system and reactivity module with modifier-based system
export class AudioSystem {
    constructor() {
        this.app = null;
        this.audioContext = null;
        this.audioSource = null;
        this.analyser = null;
        this.audioData = null;
        this.audioElement = null;
        this.audioReactive = false;
        this.audioPlaying = false;
        
        // Microphone system
        this.microphoneStream = null;
        this.microphoneSource = null;
        this.microphoneActive = false;
        this.selectedMicrophoneId = null;
        this.availableDevices = [];
        
        // Advanced audio analysis
        this.beatDetection = {
            enabled: false,
            threshold: 1.3,           // Beat detection threshold multiplier
            minTimeBetweenBeats: 300, // Minimum ms between beats
            lastBeatTime: 0,
            bassHistory: [],          // Rolling history for beat detection
            historySize: 10
        };
        
        // Enhanced frequency analysis (10-band equalizer style)
        this.frequencyBands = {
            // Sub-bass: 20-60Hz
            subBass: { start: 0, end: 8, value: 0 },
            // Bass: 60-250Hz  
            bass: { start: 8, end: 32, value: 0 },
            // Low-mid: 250-500Hz
            lowMid: { start: 32, end: 64, value: 0 },
            // Mid: 500-2kHz
            mid: { start: 64, end: 128, value: 0 },
            // High-mid: 2-4kHz
            highMid: { start: 128, end: 170, value: 0 },
            // Presence: 4-6kHz
            presence: { start: 170, end: 200, value: 0 },
            // Brilliance: 6-8kHz
            brilliance: { start: 200, end: 225, value: 0 },
            // Air: 8-12kHz
            air: { start: 225, end: 256, value: 0 },
            // Ultra: 12-16kHz (if available)
            ultra: { start: 256, end: 340, value: 0 },
            // Super: 16-20kHz+ (if available)
            super: { start: 340, end: 512, value: 0 }
        };
        
        // Audio-to-parameter mapping system
        this.parameterMappings = {};
        this.advancedMenuVisible = false;
    }

    init(app) {
        this.app = app;
    }

    async initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            this.audioData = new Uint8Array(this.analyser.frequencyBinCount);
            
            this.app.ui.updateStatus('🎵 Audio system initialized', 'success');
        } catch (error) {
            this.app.ui.updateStatus(`❌ Audio init failed: ${error.message}`, 'error');
        }
    }

    async toggleAudio() {
        if (!this.audioContext) {
            await this.initAudioContext();
        }
        
        if (!this.audioElement) {
            // Prompt user to upload audio file
            this.uploadAudioFile();
        } else {
            // Toggle audio playback and reactivity
            if (this.audioPlaying) {
                this.audioElement.pause();
                this.audioPlaying = false;
                this.audioReactive = false;
                this.app.parameters.resetAudioModifiers();
                this.app.ui.updateStatus('🎵 Audio paused', 'info');
            } else {
                try {
                    // Resume audio context if needed
                    if (this.audioContext.state === 'suspended') {
                        await this.audioContext.resume();
                    }
                    
                    await this.audioElement.play();
                    this.audioPlaying = true;
                    this.audioReactive = true;
                    this.app.ui.updateStatus('🎵 Audio playing with reactivity!', 'success');
                } catch (error) {
                    this.app.ui.updateStatus(`❌ Audio playback failed: ${error.message}`, 'error');
                }
            }
            this.app.ui.updateMenuDisplay();
        }
    }

    uploadAudioFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*,.wav,.mp3,.ogg,.m4a,.aac';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            this.app.ui.updateStatus(`🎵 Loading audio: ${file.name}...`, 'info');
            
            try {
                // Initialize audio context if needed
                if (!this.audioContext) {
                    await this.initAudioContext();
                }
                
                // Ensure audio context and analyser are available
                if (!this.audioContext || !this.analyser) {
                    throw new Error('Audio system initialization failed');
                }
                
                // Clean up previous audio
                if (this.audioElement) {
                    this.audioElement.pause();
                    this.audioElement.src = '';
                    this.audioElement = null;
                }
                
                if (this.audioSource) {
                    this.audioSource.disconnect();
                    this.audioSource = null;
                }
                
                // Create new audio element
                this.audioElement = new Audio();
                this.audioElement.preload = 'auto';
                this.audioElement.loop = true;
                
                // Create object URL
                const audioURL = URL.createObjectURL(file);
                this.audioElement.src = audioURL;
                
                // Wait for audio to load
                await new Promise((resolve, reject) => {
                    this.audioElement.oncanplaythrough = resolve;
                    this.audioElement.onerror = () => reject(new Error('Failed to decode audio file'));
                    this.audioElement.onabort = () => reject(new Error('Audio loading aborted'));
                    
                    // Timeout after 10 seconds
                    setTimeout(() => reject(new Error('Audio loading timeout')), 10000);
                });
                
                // Resume audio context if needed
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                
                // Connect audio to analyser
                this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
                this.audioSource.connect(this.analyser);
                this.audioSource.connect(this.audioContext.destination);
                
                this.app.ui.updateStatus(`🎵 Audio loaded: ${file.name}`, 'success');
                this.app.ui.updateMenuDisplay();
                
                // Auto-start playback with reactivity
                try {
                    await this.audioElement.play();
                    this.audioPlaying = true;
                    this.audioReactive = true;
                    this.app.ui.updateStatus(`🎵 Playing: ${file.name} (Reactive mode)`, 'success');
                } catch (playError) {
                    this.app.ui.updateStatus(`⚠️ Audio loaded but autoplay blocked. Click play button to start.`, 'info');
                }
                
            } catch (error) {
                console.error('Audio loading error:', error);
                this.app.ui.updateStatus(`❌ Failed to load audio: ${error.message}`, 'error');
                
                // Clean up on error
                if (this.audioElement) {
                    this.audioElement.src = '';
                    this.audioElement = null;
                }
                if (this.audioSource) {
                    this.audioSource.disconnect();
                    this.audioSource = null;
                }
            }
        };
        
        input.click();
    }

    async toggleMicrophone() {
        // M key now opens advanced audio menu
        this.showAdvancedAudioMenu();
    }


    async getAvailableDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableDevices = devices.filter(device => device.kind === 'audioinput');
            return this.availableDevices;
        } catch (error) {
            console.error('Could not enumerate devices:', error);
            return [];
        }
    }

    async startMicrophone(deviceId = null) {
        try {
            // Ensure audio context is initialized first
            if (!this.audioContext) {
                await this.initAudioContext();
            }
            
            this.app.ui.updateStatus('🎤 Requesting microphone access...', 'info');
            
            // Use specified device or the selected one
            const targetDeviceId = deviceId || this.selectedMicrophoneId;
            
            // Create audio constraints
            const audioConstraints = {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            };
            
            // Add device ID if specified
            if (targetDeviceId) {
                audioConstraints.deviceId = { exact: targetDeviceId };
                console.log('🎤 Requesting specific device:', targetDeviceId);
            } else {
                console.log('🎤 Requesting default microphone');
            }
            
            // Request microphone access
            this.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
                audio: audioConstraints
            });
            
            // Log details about the audio stream we got
            console.log('🎤 Audio stream details:');
            const audioTracks = this.microphoneStream.getAudioTracks();
            if (audioTracks.length > 0) {
                const track = audioTracks[0];
                console.log('  - Track label:', track.label || 'Unknown device');
                console.log('  - Track enabled:', track.enabled);
                console.log('  - Track ready state:', track.readyState);
                console.log('  - Track settings:', track.getSettings());
                console.log('  - Track constraints:', track.getConstraints());
            }
            
            // Resume audio context if needed
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Stop any playing audio file
            if (this.audioElement && this.audioPlaying) {
                this.audioElement.pause();
                this.audioPlaying = false;
            }
            
            // Connect microphone to analyzer
            this.microphoneSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
            this.microphoneSource.connect(this.analyser);
            
            this.microphoneActive = true;
            this.audioReactive = true;
            
            // Debug: Log audio context and analyser settings (controlled by debug settings)
            if (this.app && this.app.debugUI && this.app.debugUI.shouldLog('microphoneSetup')) {
                console.log('🎤 Microphone setup complete:');
                console.log('  - Audio context state:', this.audioContext.state);
                console.log('  - Audio context sample rate:', this.audioContext.sampleRate);
                console.log('  - Analyser FFT size:', this.analyser.fftSize);
                console.log('  - Analyser frequency bin count:', this.analyser.frequencyBinCount);
                console.log('  - Analyser smoothing:', this.analyser.smoothingTimeConstant);
                console.log('  - Audio data array length:', this.audioData.length);
                
                // Test immediate data capture
                setTimeout(() => {
                    this.analyser.getByteFrequencyData(this.audioData);
                    const maxValue = Math.max(...this.audioData);
                    const avgValue = this.audioData.reduce((a, b) => a + b, 0) / this.audioData.length;
                    console.log(`🎤 Initial audio check: Max=${maxValue}, Avg=${avgValue.toFixed(2)}`);
                    if (maxValue === 0) {
                        console.log('⚠️ No audio signal detected - try speaking/making noise');
                    }
                }, 1000);
            }
            
            this.app.ui.updateStatus('🎤 Microphone active with reactivity!', 'success');
            this.app.ui.updateMenuDisplay();
            
            // Update advanced menu status if open
            if (this.advancedMenuVisible) {
                this.updateAdvancedMicrophoneStatus();
            }
            
        } catch (error) {
            console.error('Microphone access error:', error);
            let errorMessage = 'Failed to access microphone';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No microphone found. Please connect a microphone and try again.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Microphone is busy or not available.';
            }
            
            this.app.ui.updateStatus(`❌ ${errorMessage}`, 'error');
            this.microphoneActive = false;
        }
    }

    stopMicrophone() {
        try {
            // Stop microphone stream
            if (this.microphoneStream) {
                this.microphoneStream.getTracks().forEach(track => track.stop());
                this.microphoneStream = null;
            }
            
            // Disconnect microphone source
            if (this.microphoneSource) {
                this.microphoneSource.disconnect();
                this.microphoneSource = null;
            }
            
            this.microphoneActive = false;
            this.audioReactive = false;
            this.app.parameters.resetAudioModifiers();
            
            this.app.ui.updateStatus('🎤 Microphone stopped', 'info');
            this.app.ui.updateMenuDisplay();
            
            // Update advanced menu status if open
            if (this.advancedMenuVisible) {
                this.updateAdvancedMicrophoneStatus();
            }
            
        } catch (error) {
            console.error('Error stopping microphone:', error);
            this.app.ui.updateStatus('❌ Error stopping microphone', 'error');
        }
    }

    analyzeAudio() {
        if (!this.analyser || !this.audioData || !this.audioReactive || (!this.audioPlaying && !this.microphoneActive)) {
            return { 
                bass: 0, mid: 0, treble: 0, overall: 0, 
                beat: false, 
                frequencyBands: this.frequencyBands
            };
        }
        
        this.analyser.getByteFrequencyData(this.audioData);
        
        // Enhanced frequency analysis - update all bands
        for (const [bandName, band] of Object.entries(this.frequencyBands)) {
            let sum = 0;
            const binCount = Math.min(band.end, this.audioData.length) - band.start;
            
            for (let i = band.start; i < band.end && i < this.audioData.length; i++) {
                sum += this.audioData[i];
            }
            
            band.value = binCount > 0 ? (sum / binCount) / 255.0 : 0;
        }
        
        // Legacy 3-band analysis for backward compatibility
        const bass = this.frequencyBands.bass.value;
        const mid = this.frequencyBands.mid.value;
        const treble = (this.frequencyBands.highMid.value + this.frequencyBands.presence.value) / 2;
        const overall = (bass + mid + treble) / 3.0;
        
        // Beat detection algorithm
        let beatDetected = false;
        if (this.beatDetection.enabled) {
            beatDetected = this.detectBeat(bass);
        }
        
        // Debug logging when microphone is active (controlled by debug settings)
        if (this.microphoneActive && this.app && this.app.debugUI) {
            // Log every second instead of every 2 seconds for better feedback
            if (Math.floor(Date.now() / 1000) % 1 === 0) {
                const maxValue = Math.max(...this.audioData);
                const avgValue = this.audioData.reduce((a, b) => a + b, 0) / this.audioData.length;
                
                if (this.app.debugUI.shouldLog('audioLevels')) {
                    console.log(`🎤 LIVE: Bass=${bass.toFixed(3)}, Mid=${mid.toFixed(3)}, Treble=${treble.toFixed(3)}, Overall=${overall.toFixed(3)}`);
                }
                
                if (this.app.debugUI.shouldLog('audioRawData')) {
                    console.log(`🎤 RAW: Max=${maxValue}/255 (${(maxValue/255*100).toFixed(1)}%), Avg=${avgValue.toFixed(1)}`);
                }
                
                // Show which parameters would be affected
                if (this.app.debugUI.shouldLog('audioEffects')) {
                    if (overall > 0.01) {
                        console.log(`🎨 Would affect: center_fill_radius×${(1.0 + bass * 0.8 * 1.5).toFixed(2)}, rotation_speed×${(1.0 + mid * 0.4).toFixed(2)}`);
                    } else if (maxValue > 0) {
                        console.log('⚠️ Audio detected but levels very low - try louder input');
                    } else {
                        console.log('❌ No audio signal - check microphone settings/volume');
                    }
                }
            }
        }
        
        return { 
            bass, mid, treble, overall, 
            beat: beatDetected,
            frequencyBands: this.frequencyBands
        };
    }
    
    // Beat detection algorithm based on bass energy variation
    detectBeat(currentBass) {
        const now = Date.now();
        
        // Add current bass to history
        this.beatDetection.bassHistory.push(currentBass);
        
        // Keep history at specified size
        if (this.beatDetection.bassHistory.length > this.beatDetection.historySize) {
            this.beatDetection.bassHistory.shift();
        }
        
        // Need enough history for beat detection
        if (this.beatDetection.bassHistory.length < this.beatDetection.historySize) {
            return false;
        }
        
        // Calculate average bass energy over history
        const averageBass = this.beatDetection.bassHistory.reduce((a, b) => a + b, 0) / this.beatDetection.bassHistory.length;
        
        // Check if current bass exceeds threshold and enough time has passed
        const isAboveThreshold = currentBass > (averageBass * this.beatDetection.threshold);
        const enoughTimePassed = (now - this.beatDetection.lastBeatTime) > this.beatDetection.minTimeBetweenBeats;
        
        if (isAboveThreshold && enoughTimePassed) {
            this.beatDetection.lastBeatTime = now;
            return true;
        }
        
        return false;
    }

    // Get current volume level for UI display (0-1 range)
    getCurrentVolumeLevel() {
        if (!this.microphoneActive || !this.analyser || !this.audioData) {
            return 0;
        }
        
        // Get fresh audio data
        this.analyser.getByteFrequencyData(this.audioData);
        
        // Calculate overall volume level
        const maxValue = Math.max(...this.audioData);
        const avgValue = this.audioData.reduce((a, b) => a + b, 0) / this.audioData.length;
        
        // Use a combination of max and average for more responsive display
        const volumeLevel = (maxValue * 0.7 + avgValue * 0.3) / 255.0;
        
        return Math.min(1.0, volumeLevel);
    }

    applyReactivity(parameters) {
        if (!this.audioReactive || (!this.audioPlaying && !this.microphoneActive)) {
            // Reset all modifiers when not reactive
            parameters.resetAudioModifiers();
            return;
        }
        
        const audioLevels = this.analyzeAudio();
        
        // Apply custom parameter mappings if any exist
        const hasCustomMappings = Object.keys(this.parameterMappings).length > 0;
        
        if (hasCustomMappings) {
            // Use advanced mapping system - collect all parameter modifications
            const parameterModifications = {};
            
            // Get all parameters (artistic + debug)
            const allParams = [...parameters.getParameterKeys(), ...parameters.getAllDebugParameterKeys()];
            
            // Initialize all parameters with base values
            allParams.forEach(paramKey => {
                const baseValue = parameters.getBaseValue ? parameters.getBaseValue(paramKey) : parameters.getValue(paramKey);
                parameterModifications[paramKey] = baseValue;
            });
            
            // Process all mappings and accumulate effects
            Object.entries(this.parameterMappings).forEach(([mappingKey, mapping]) => {
                if (mapping.source && mapping.paramKey) {
                    const paramKey = mapping.paramKey;
                    const baseValue = parameterModifications[paramKey];
                    
                    if (baseValue !== undefined) {
                        let audioValue = 0;
                        
                        // Get audio value from mapped source
                        switch (mapping.source) {
                            case 'beat':
                                audioValue = audioLevels.beat ? 1.0 : 0.0;
                                break;
                            case 'overall':
                                audioValue = audioLevels.overall;
                                break;
                            case 'bass':
                                audioValue = audioLevels.bass;
                                break;
                            case 'mid':
                                audioValue = audioLevels.mid;
                                break;
                            case 'treble':
                                audioValue = audioLevels.treble;
                                break;
                            default:
                                // Use frequency band value
                                if (audioLevels.frequencyBands[mapping.source]) {
                                    audioValue = audioLevels.frequencyBands[mapping.source].value;
                                }
                                break;
                        }
                        
                        // Apply sensitivity and add to the existing value
                        const multiplier = 1.0 + (audioValue * mapping.sensitivity);
                        parameterModifications[paramKey] = baseValue * multiplier;
                    }
                }
            });
            
            // Apply all modifications
            Object.entries(parameterModifications).forEach(([paramKey, modifiedValue]) => {
                // Special handling for parameters that need integer values
                if (paramKey === 'kaleidoscope_segments') {
                    modifiedValue = Math.round(modifiedValue / 2) * 2; // Keep even
                } else if (paramKey === 'layer_count') {
                    modifiedValue = Math.round(modifiedValue);
                }
                
                parameters.setAudioModifier(paramKey, modifiedValue);
            });
        } else {
            // Fallback to legacy hardcoded mappings for backward compatibility
            const bassMultiplier = 1.0 + (audioLevels.bass * 0.8);      // 1.0 to 1.8x
            const midMultiplier = 1.0 + (audioLevels.mid * 0.4);        // 1.0 to 1.4x
            const trebleMultiplier = 1.0 + (audioLevels.treble * 0.3);  // 1.0 to 1.3x
            const overallMultiplier = 1.0 + (audioLevels.overall * 0.5); // 1.0 to 1.5x
            
            // Bass effects - make the center circle really pulse!
            parameters.setAudioModifier('center_fill_radius', parameters.getBaseValue('center_fill_radius') * bassMultiplier * 1.5); // Extra bass sensitivity for center
            parameters.setAudioModifier('truchet_radius', parameters.getBaseValue('truchet_radius') * bassMultiplier);
            parameters.setAudioModifier('zoom_level', parameters.getBaseValue('zoom_level') * (1.0 + (audioLevels.bass * 0.3))); // Slight zoom pulse
            
            // Mid frequencies affect rotation and movement
            parameters.setAudioModifier('rotation_speed', parameters.getBaseValue('rotation_speed') * midMultiplier);
            parameters.setAudioModifier('plane_rotation_speed', parameters.getBaseValue('plane_rotation_speed') * midMultiplier);
            parameters.setAudioModifier('fly_speed', parameters.getBaseValue('fly_speed') * (1.0 + (audioLevels.mid * 0.6)));
            
            // Treble affects visual complexity and color
            const kaleidoscopeValue = parameters.getBaseValue('kaleidoscope_segments') * trebleMultiplier;
            // Ensure kaleidoscope segments remain even (required for proper symmetry)
            parameters.setAudioModifier('kaleidoscope_segments', Math.round(kaleidoscopeValue / 2) * 2);
            parameters.setAudioModifier('color_intensity', parameters.getBaseValue('color_intensity') * trebleMultiplier);
            parameters.setAudioModifier('color_speed', parameters.getBaseValue('color_speed') * trebleMultiplier);
            
            // Overall volume affects contrast and layer count
            parameters.setAudioModifier('contrast', parameters.getBaseValue('contrast') * overallMultiplier);
            parameters.setAudioModifier('layer_count', parameters.getBaseValue('layer_count') * (1.0 + (audioLevels.overall * 0.3)));
            
            // Path effects for more dynamic movement
            parameters.setAudioModifier('path_scale', parameters.getBaseValue('path_scale') * (1.0 + (audioLevels.overall * 0.4)));
            
            // Camera parameters - pass through unchanged but set as modifiers to ensure consistency
            parameters.setAudioModifier('camera_tilt_x', parameters.getBaseValue('camera_tilt_x'));
            parameters.setAudioModifier('camera_tilt_y', parameters.getBaseValue('camera_tilt_y'));
            parameters.setAudioModifier('camera_roll', parameters.getBaseValue('camera_roll'));
            parameters.setAudioModifier('path_stability', parameters.getBaseValue('path_stability'));
        }
    }

    isReactive() {
        return this.audioReactive && (this.audioPlaying || this.microphoneActive);
    }
    
    // Show advanced audio sync menu
    showAdvancedAudioMenu() {
        if (this.advancedMenuVisible) {
            this.hideAdvancedAudioMenu();
            return;
        }
        
        // Create menu dialog (no full-screen overlay)
        const dialog = document.createElement('div');
        dialog.id = 'advancedAudioOverlay';
        // Styles are now handled in audio-menu.css

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #FF5722; margin: 0; font-size: 18px;">🎵 Advanced Audio Sync Control</h2>
                <button id="advancedAudioClose" style="background: #666; color: #fff; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-family: 'Courier New', monospace;">✕ Close</button>
            </div>
            
            <!-- Two Column Layout -->
            <div style="display: flex; gap: 15px; height: 80vh;">
                
                <!-- Left Column: Equalizer Visualization + Controls -->
                <div style="flex: 0 0 380px; display: flex; flex-direction: column; gap: 12px;">
                    
                    <!-- Equalizer Visualization Section -->
                    <div style="background: rgba(40, 40, 40, 0.2); border-radius: 6px; padding: 12px; border: 1px solid #444;">
                        <h3 style="color: #4CAF50; margin-bottom: 12px; font-size: 14px;">📊 Real-Time Frequency Analysis</h3>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="display: flex; align-items: center; font-size: 12px; margin-bottom: 6px;">
                                <input type="checkbox" id="beatDetectionToggle" ${this.beatDetection.enabled ? 'checked' : ''} style="margin-right: 8px;">
                                Enable Beat Detection
                            </label>
                            
                            <div style="display: flex; align-items: center; gap: 10px; font-size: 11px; margin-bottom: 6px;">
                                <label>Beat Sensitivity:</label>
                                <input type="range" id="beatThreshold" min="1.1" max="2.0" step="0.1" value="${this.beatDetection.threshold}" 
                                       style="flex: 1;">
                                <span id="beatThresholdValue">${this.beatDetection.threshold}</span>
                            </div>
                        </div>
                        
                        <!-- 10-Band Equalizer Display -->
                        <div id="equalizerDisplay" style="display: flex; align-items: end; gap: 3px; height: 120px; margin-bottom: 12px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 4px;">
                            <!-- Equalizer bars will be populated by JavaScript -->
                        </div>
                        
                        <div style="font-size: 9px; color: #888; text-align: center; line-height: 1.2;">
                            Sub│Bass│LMid│Mid│HMid│Pres│Brill│Air│Ultra│Super
                        </div>
                    </div>
                    
                    <!-- Microphone Selection Section -->
                    <div style="background: rgba(40, 40, 40, 0.2); border-radius: 6px; padding: 12px; border: 1px solid #444;">
                        <h3 style="color: #9C27B0; margin-bottom: 12px; font-size: 14px;">🎤 Microphone Selection</h3>
                        
                        <div style="font-size: 11px; line-height: 1.3; color: #cccccc; margin-bottom: 10px;">
                            Select audio input device for reactivity
                        </div>
                        
                        <div style="margin-bottom: 10px;">
                            <select id="advancedMicrophoneSelect" style="width: 100%; padding: 6px; background: #2a2a2a; border: 1px solid #555; color: #fff; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 11px;">
                                <option value="">Select microphone...</option>
                            </select>
                        </div>
                        
                        <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                            <button id="advancedMicrophoneRefresh" style="flex: 1; padding: 6px; background: #2196F3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Refresh</button>
                            <button id="advancedMicrophoneConnect" style="flex: 2; padding: 6px; background: #9C27B0; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Connect</button>
                        </div>
                        
                        <div id="advancedMicrophoneStatus" style="font-size: 10px; color: #888; margin-bottom: 10px;">
                            Not connected
                        </div>
                        
                        <div id="advancedMicrophoneVolumeBar" style="display: none;">
                            <div style="font-size: 10px; color: #9C27B0; margin-bottom: 4px;">Volume Level:</div>
                            <div style="background: #333; border-radius: 3px; height: 14px; position: relative; border: 1px solid #555;">
                                <div id="advancedMicrophoneVolumeLevel" style="background: linear-gradient(90deg, #4CAF50 0%, #FFC107 70%, #F44336 100%); height: 100%; border-radius: 2px; width: 0%; transition: width 0.1s ease;"></div>
                                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #fff; font-weight: bold;" id="advancedMicrophoneVolumeText">0%</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Control Buttons Section -->
                    <div style="background: rgba(40, 40, 40, 0.2); border-radius: 6px; padding: 12px; border: 1px solid #444;">
                        <h3 style="color: #c41b83ff; margin-bottom: 12px; font-size: 14px;">💾 Manage Advanced Audio</h3>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                            <button id="resetMappings" style="padding: 6px; background: #F44336; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Reset All</button>
                            <button id="loadMappings" style="padding: 6px; background: #2196F3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Load Mappings</button>
                            <button id="saveMappings" style="padding: 6px; background: #4CAF50; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Save Mappings</button>
                            <button id="loadAudio" style="padding: 6px; background: #FF9800; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 10px;">Load Audio</button>
                        </div>
                        
                        <!-- Random Assignment Button -->
                        <div style="margin-top: 10px; text-align: center;">
                            <button id="randomAssignMappings" style="padding: 8px 12px; background: #9C27B0; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 11px; font-weight: bold;">🎲 Random Chaos</button>
                        </div>
                    </div>
                    
                </div>
                
                <!-- Right Column: Frequency Mapping -->
                <div style="flex: 1; background: rgba(40, 40, 40, 0.2); border-radius: 6px; padding: 15px; border: 1px solid #444; overflow: hidden;">
                    <h3 style="color: #FF9800; margin-bottom: 15px; font-size: 14px;">🎛️ Audio → Parameter Mapping</h3>
                    
                    <div style="font-size: 11px; color: #ccc; margin-bottom: 15px;">
                        Assign fractal parameters to each audio frequency band and control.
                    </div>
                    
                    <div id="frequencyMappings" style="height: calc(100% - 80px); overflow-y: auto; padding-right: 5px;">
                        <!-- Frequency mapping controls will be populated here -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        
        this.advancedMenuVisible = true;
        
        // Set up event handlers
        this.setupAdvancedMenuHandlers(dialog);
        
        // Initialize the display
        this.updateEqualizerDisplay();
        this.populateFrequencyMappings();
        
        // Start real-time updates
        this.startEqualizerUpdates();
    }
    
    hideAdvancedAudioMenu() {
        const overlay = document.getElementById('advancedAudioOverlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
        this.advancedMenuVisible = false;
        this.stopEqualizerUpdates();
    }
    
    setupAdvancedMenuHandlers(dialog) {
        // Close button
        const closeBtn = document.getElementById('advancedAudioClose');
        if (closeBtn) {
            closeBtn.onclick = () => this.hideAdvancedAudioMenu();
        }
        
        // Beat detection toggle
        const beatToggle = document.getElementById('beatDetectionToggle');
        if (beatToggle) {
            beatToggle.onchange = () => {
                this.beatDetection.enabled = beatToggle.checked;
            };
        }
        
        // Beat threshold slider
        const beatThreshold = document.getElementById('beatThreshold');
        const beatThresholdValue = document.getElementById('beatThresholdValue');
        if (beatThreshold && beatThresholdValue) {
            beatThreshold.oninput = () => {
                this.beatDetection.threshold = parseFloat(beatThreshold.value);
                beatThresholdValue.textContent = beatThreshold.value;
            };
        }
        
        // Click outside to close
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                this.hideAdvancedAudioMenu();
            }
        };
        
        // ESC key handling moved to main controls.js for better coordination
        
        // Advanced microphone controls
        this.setupAdvancedMicrophoneHandlers();
    }
    
    async setupAdvancedMicrophoneHandlers() {
        // Populate microphone devices
        await this.populateAdvancedMicrophoneList();
        
        // Refresh button
        const refreshBtn = document.getElementById('advancedMicrophoneRefresh');
        if (refreshBtn) {
            refreshBtn.onclick = async () => {
                await this.populateAdvancedMicrophoneList();
                this.updateAdvancedMicrophoneStatus();
            };
        }
        
        // Connect button
        const connectBtn = document.getElementById('advancedMicrophoneConnect');
        if (connectBtn) {
            connectBtn.onclick = async () => {
                const select = document.getElementById('advancedMicrophoneSelect');
                const selectedDeviceId = select ? select.value : '';
                
                if (this.microphoneActive) {
                    // Disconnect current microphone
                    this.stopMicrophone();
                } else {
                    if (!selectedDeviceId) {
                        this.app.ui.updateStatus('Please select a microphone first', 'error');
                        return;
                    }
                    
                    // Ensure audio context is initialized before connecting
                    if (!this.audioContext) {
                        await this.initAudioContext();
                    }
                    
                    // Connect to selected microphone
                    this.selectedMicrophoneId = selectedDeviceId;
                    await this.startMicrophone(selectedDeviceId);
                }
                
                this.updateAdvancedMicrophoneStatus();
            };
        }
        
        // Update initial status
        this.updateAdvancedMicrophoneStatus();
    }
    
    async populateAdvancedMicrophoneList() {
        const select = document.getElementById('advancedMicrophoneSelect');
        if (!select) return;
        
        try {
            const devices = await this.getAvailableDevices();
            
            // Clear existing options except the first one
            select.innerHTML = '<option value="">Select microphone...</option>';
            
            // Add device options
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Microphone ${device.deviceId.substring(0, 8)}`;
                if (device.deviceId === this.selectedMicrophoneId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
        } catch (error) {
            console.error('Error populating microphone list:', error);
        }
    }
    
    updateAdvancedMicrophoneStatus() {
        const statusElement = document.getElementById('advancedMicrophoneStatus');
        const connectBtn = document.getElementById('advancedMicrophoneConnect');
        const volumeBar = document.getElementById('advancedMicrophoneVolumeBar');
        
        if (this.microphoneActive) {
            if (statusElement) statusElement.textContent = 'Connected and active';
            if (statusElement) statusElement.style.color = '#4CAF50';
            if (connectBtn) connectBtn.textContent = 'Disconnect';
            if (connectBtn) connectBtn.style.background = '#F44336';
            if (volumeBar) volumeBar.style.display = 'block';
        } else {
            if (statusElement) statusElement.textContent = 'Not connected';
            if (statusElement) statusElement.style.color = '#888';
            if (connectBtn) connectBtn.textContent = 'Connect';
            if (connectBtn) connectBtn.style.background = '#9C27B0';
            if (volumeBar) volumeBar.style.display = 'none';
        }
    }
    
    updateAdvancedMicrophoneVolumeLevel() {
        if (!this.microphoneActive) return;
        
        const volumeLevel = this.getCurrentVolumeLevel();
        const volumeBar = document.getElementById('advancedMicrophoneVolumeLevel');
        const volumeText = document.getElementById('advancedMicrophoneVolumeText');
        
        if (volumeBar) {
            volumeBar.style.width = `${volumeLevel * 100}%`;
        }
        
        if (volumeText) {
            volumeText.textContent = `${Math.round(volumeLevel * 100)}%`;
        }
    }
    
    updateEqualizerDisplay() {
        const container = document.getElementById('equalizerDisplay');
        if (!container) return;
        
        // Create bars only if they don't exist (first time)
        if (container.children.length === 0) {
            const bandNames = Object.keys(this.frequencyBands);
            const colors = ['#F44336', '#FF5722', '#FF9800', '#FFC107', '#FFEB3B', '#8BC34A', '#4CAF50', '#00BCD4', '#2196F3', '#9C27B0'];
            
            bandNames.forEach((bandName, index) => {
                const bar = document.createElement('div');
                bar.className = 'eq-bar';
                bar.dataset.bandName = bandName;
                bar.style.cssText = `
                    flex: 1;
                    background: ${colors[index] || '#666'};
                    margin: 0 1px;
                    border-radius: 2px 2px 0 0;
                    transition: height 0.08s ease;
                    min-height: 2px;
                    height: 2%;
                `;
                container.appendChild(bar);
            });
        }
        
        // Update only the heights of existing bars (much faster)
        const bars = container.children;
        const bandNames = Object.keys(this.frequencyBands);
        
        for (let i = 0; i < bars.length && i < bandNames.length; i++) {
            const band = this.frequencyBands[bandNames[i]];
            const height = Math.max(2, band.value * 100);
            if (bars[i].style.height !== `${height}%`) {
                bars[i].style.height = `${height}%`;
            }
        }
    }
    
    // Generate cached parameter options for performance
    _generateParameterOptions() {
        const artisticParams = this.app.parameters.getParameterKeys();
        const debugParams = this.app.parameters.getAllDebugParameterKeys();
        
        const artisticOptionsHTML = artisticParams.map(paramKey => {
            try {
                const param = this.app.parameters.getParameter(paramKey);
                return `<option value="${paramKey}">${param.name}</option>`;
            } catch (error) {
                console.error('Error getting artistic parameter:', paramKey, error);
                return '';
            }
        }).join('');
        
        const debugOptionsHTML = debugParams.map(paramKey => {
            try {
                const param = this.app.parameters.getParameter(paramKey);
                return `<option value="${paramKey}">${param.name}</option>`;
            } catch (error) {
                console.error('Error getting debug parameter:', paramKey, error);
                return '';
            }
        }).join('');
        
        return { artisticOptionsHTML, debugOptionsHTML };
    }
    
    // Clear cached parameter options (call when parameters might have changed)
    _clearParameterCache() {
        this._cachedParameterOptions = null;
    }
    
    populateFrequencyMappings() {
        const container = document.getElementById('frequencyMappings');
        if (!container) return;
        
        // Define all available frequency bands and controls
        const audioSources = [
            { key: 'subBass', name: 'Sub-Bass', description: '20-60Hz', color: '#8E24AA' },
            { key: 'bass', name: 'Bass', description: '60-250Hz', color: '#1976D2' }, 
            { key: 'lowMid', name: 'Low-Mid', description: '250-500Hz', color: '#00796B' },
            { key: 'mid', name: 'Mid', description: '500-2kHz', color: '#388E3C' },
            { key: 'highMid', name: 'High-Mid', description: '2-4kHz', color: '#F57C00' },
            { key: 'presence', name: 'Presence', description: '4-6kHz', color: '#E64A19' },
            { key: 'brilliance', name: 'Brilliance', description: '6-8kHz', color: '#C62828' },
            { key: 'air', name: 'Air', description: '8-12kHz', color: '#AD1457' },
            { key: 'ultra', name: 'Ultra', description: '12-16kHz', color: '#6A1B9A' },
            { key: 'super', name: 'Super', description: '16-20kHz+', color: '#4527A0' },
            { key: 'beat', name: 'Beat Detection', description: 'Beat trigger', color: '#D32F2F' },
            { key: 'overall', name: 'Overall Volume', description: 'Total audio level', color: '#455A64' }
        ];
        
        // Cache parameter options to avoid repeated lookups
        if (!this._cachedParameterOptions) {
            this._cachedParameterOptions = this._generateParameterOptions();
        }
        
        const { artisticOptionsHTML, debugOptionsHTML } = this._cachedParameterOptions;
        
        // Find which parameters are currently mapped to each audio source
        const reverseMappings = {};
        Object.entries(this.parameterMappings).forEach(([mappingKey, mapping]) => {
            if (mapping.source) {
                if (!reverseMappings[mapping.source]) {
                    reverseMappings[mapping.source] = [];
                }
                reverseMappings[mapping.source].push({ 
                    mappingKey: mappingKey,
                    paramKey: mapping.paramKey || mappingKey, // Support both old and new format
                    sensitivity: mapping.sensitivity 
                });
            }
        });
        
        container.innerHTML = audioSources.map(audioSource => {
            const mappedParams = reverseMappings[audioSource.key] || [];
            
            return `
                <div style="margin-bottom: 12px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; border-left: 3px solid ${audioSource.color};" data-audio-source="${audioSource.key}">
                    <div style="font-size: 11px; color: #fff; margin-bottom: 6px; display: flex; justify-content: space-between;">
                        <span style="font-weight: bold;">${audioSource.name}</span>
                        <span style="color: #999; font-size: 9px;">${audioSource.description}</span>
                    </div>
                    
                    <!-- Add Parameter Section -->
                    <div style="display: flex; gap: 6px; align-items: center; font-size: 10px; margin-bottom: 8px;">
                        <select class="frequency-add-parameter" data-audio-source="${audioSource.key}" style="flex: 1; padding: 2px; background: #333; border: 1px solid #555; color: #fff; border-radius: 2px; font-size: 9px;">
                            <option value="">+ Add parameter...</option>
                            <optgroup label="Artistic Parameters">
                                ${artisticOptionsHTML}
                            </optgroup>
                            <optgroup label="Debug Parameters">
                                ${debugOptionsHTML}
                            </optgroup>
                        </select>
                        <button class="frequency-add-btn" data-audio-source="${audioSource.key}" style="padding: 2px 8px; background: #4CAF50; color: #fff; border: none; border-radius: 2px; cursor: pointer; font-size: 9px;">Add</button>
                    </div>
                    
                    <!-- Mapped Parameters List -->
                    <div class="mapped-parameters" data-audio-source="${audioSource.key}">
                        ${mappedParams.map(mappedParam => {
                            try {
                                const param = this.app.parameters.getParameter(mappedParam.paramKey);
                                const paramType = artisticParams.includes(mappedParam.paramKey) ? 'artistic' : 'debug';
                                return `
                                    <div style="display: flex; gap: 6px; align-items: center; font-size: 9px; margin-bottom: 4px; padding: 4px; background: rgba(0,0,0,0.3); border-radius: 2px;" data-param-mapping="${mappedParam.mappingKey}">
                                        <span style="flex: 1; color: ${paramType === 'artistic' ? '#4CAF50' : '#FF9800'};" title="${paramType === 'artistic' ? 'Artistic Parameter' : 'Debug Parameter'}">${param.name}</span>
                                        <input type="range" class="param-sensitivity-slider" data-mapping-key="${mappedParam.mappingKey}"
                                               min="0" max="3" step="0.1" value="${mappedParam.sensitivity}" 
                                               style="width: 50px;" title="Sensitivity">
                                        <span class="param-sensitivity-value" style="width: 25px; text-align: center; color: #fff;">${mappedParam.sensitivity.toFixed(1)}</span>
                                        <button class="param-remove-btn" data-mapping-key="${mappedParam.mappingKey}" style="padding: 1px 4px; background: #F44336; color: #fff; border: none; border-radius: 2px; cursor: pointer; font-size: 8px;">×</button>
                                    </div>
                                `;
                            } catch (error) {
                                console.error('Error creating mapped parameter display:', mappedParam.paramKey, error);
                                return '';
                            }
                        }).join('')}
                        ${mappedParams.length === 0 ? `<div style="font-size: 9px; color: #666; font-style: italic; padding: 4px;">No parameters mapped</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Set up event handlers for the mapping controls
        this.setupFrequencyMappingEventHandlers();
    }
    
    setupFrequencyMappingEventHandlers() {
        // Handle adding new parameter mappings
        document.querySelectorAll('.frequency-add-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const audioSource = e.target.dataset.audioSource;
                const select = document.querySelector(`.frequency-add-parameter[data-audio-source="${audioSource}"]`);
                const paramKey = select.value;
                
                if (paramKey) {
                    // Create a unique mapping key for this parameter-frequency combination
                    const mappingKey = `${paramKey}_${audioSource}`;
                    
                    // Add new mapping (allowing multiple frequency bands per parameter)
                    this.parameterMappings[mappingKey] = {
                        paramKey: paramKey,
                        source: audioSource,
                        sensitivity: 1.0
                    };
                    
                    // Reset select and update display
                    select.value = '';
                    this.populateFrequencyMappings();
                }
            });
        });
        
        // Handle parameter removal
        document.querySelectorAll('.param-remove-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const mappingKey = e.target.dataset.mappingKey;
                delete this.parameterMappings[mappingKey];
                this.populateFrequencyMappings();
            });
        });
        
        // Handle sensitivity changes for individual parameters
        document.querySelectorAll('.param-sensitivity-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const mappingKey = e.target.dataset.mappingKey;
                const sensitivity = parseFloat(e.target.value);
                
                if (this.parameterMappings[mappingKey]) {
                    this.parameterMappings[mappingKey].sensitivity = sensitivity;
                }
                
                // Update the displayed value
                const valueSpan = e.target.parentElement.querySelector('.param-sensitivity-value');
                if (valueSpan) {
                    valueSpan.textContent = sensitivity.toFixed(1);
                }
            });
        });
        
        // Reset mappings button
        const resetBtn = document.getElementById('resetMappings');
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (confirm('Reset all audio-to-parameter mappings?')) {
                    this.parameterMappings = {};
                    this.populateFrequencyMappings();
                }
            };
        }
        
        // Load mappings button
        const loadMappingsBtn = document.getElementById('loadMappings');
        if (loadMappingsBtn) {
            loadMappingsBtn.onclick = () => {
                this.loadMappingsFromFile();
            };
        }
        
        // Save mappings button
        const saveBtn = document.getElementById('saveMappings');
        if (saveBtn) {
            saveBtn.onclick = () => {
                this.saveMappingsToFile();
            };
        }
        
        // Load audio button
        const loadAudioBtn = document.getElementById('loadAudio');
        if (loadAudioBtn) {
            loadAudioBtn.onclick = () => {
                this.uploadAudioFile();
            };
        }
        
        // Random assignment button
        const randomBtn = document.getElementById('randomAssignMappings');
        if (randomBtn) {
            randomBtn.onclick = () => {
                this.randomlyAssignArtisticParameters();
            };
        }
    }
    
    loadPresetMappings() {
        // Load a sensible default mapping preset
        this.parameterMappings = {
            'center_fill_radius': { source: 'bass', sensitivity: 2.0 },
            'rotation_speed': { source: 'mid', sensitivity: 1.5 },
            'color_intensity': { source: 'highMid', sensitivity: 1.2 },
            'color_speed': { source: 'presence', sensitivity: 1.0 },
            'kaleidoscope_segments': { source: 'brilliance', sensitivity: 0.8 },
            'contrast': { source: 'overall', sensitivity: 1.3 },
            'zoom_level': { source: 'subBass', sensitivity: 0.5 },
            'fly_speed': { source: 'lowMid', sensitivity: 1.1 },
            'truchet_radius': { source: 'air', sensitivity: 0.9 }
        };
        
        this.populateFrequencyMappings();
        this.app.ui.updateStatus('🎵 Loaded preset audio mappings', 'success');
    }
    
    randomlyAssignArtisticParameters() {
        // Clear existing mappings
        this.parameterMappings = {};
        
        // Get all artistic parameters (excluding color and speed parameters for stability)
        const artisticParams = this.app.parameters.getParameterKeys().filter(key => 
            !['color_intensity', 'color_speed'].includes(key)
        );
        
        // Define available frequency bands
        const frequencyBands = [
            'subBass', 'bass', 'lowMid', 'mid', 'highMid', 
            'presence', 'brilliance', 'air', 'sparkle', 'overall'
        ];
        
        // Randomly assign 6-8 artistic parameters to random frequency bands
        const numAssignments = Math.floor(Math.random() * 3) + 6; // 6-8 assignments
        
        for (let i = 0; i < numAssignments; i++) {
            // Pick a random artistic parameter
            const paramKey = artisticParams[Math.floor(Math.random() * artisticParams.length)];
            
            // Pick a random frequency band
            const audioSource = frequencyBands[Math.floor(Math.random() * frequencyBands.length)];
            
            // Create unique mapping key
            const mappingKey = `${paramKey}_${audioSource}`;
            
            // Skip if this exact mapping already exists
            if (this.parameterMappings[mappingKey]) continue;
            
            // Create mapping with random sensitivity between 0.5 and 2.5
            this.parameterMappings[mappingKey] = {
                paramKey: paramKey,
                source: audioSource,
                sensitivity: Math.random() * 2.0 + 0.5 // 0.5 to 2.5
            };
        }
        
        // Update the display
        this.populateFrequencyMappings();
        this.app.ui.updateStatus('🎲 Randomly assigned artistic parameters to audio frequencies', 'success');
    }
    
    saveMappingsToFile() {
        try {
            // Create mapping data with metadata
            const mappingData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                beatDetection: {
                    enabled: this.beatDetection.enabled,
                    threshold: this.beatDetection.threshold,
                    minTimeBetweenBeats: this.beatDetection.minTimeBetweenBeats
                },
                parameterMappings: this.parameterMappings
            };
            
            // Convert to JSON string
            const jsonString = JSON.stringify(mappingData, null, 2);
            
            // Create downloadable file
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const link = document.createElement('a');
            link.href = url;
            link.download = `kaldao-audio-mappings-${new Date().toISOString().slice(0, -8).replace(/[:.]/g, '-')}.json`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            this.app.ui.updateStatus('💾 Audio mappings saved to file', 'success');
            
        } catch (error) {
            console.error('Error saving audio mappings:', error);
            this.app.ui.updateStatus('❌ Failed to save audio mappings', 'error');
        }
    }
    
    loadMappingsFromFile() {
        // Create file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                this.app.ui.updateStatus('📁 Loading audio mappings...', 'info');
                
                // Read file content
                const text = await file.text();
                const mappingData = JSON.parse(text);
                
                // Validate file structure
                if (!mappingData.parameterMappings) {
                    throw new Error('Invalid mapping file format: missing parameterMappings');
                }
                
                // Load beat detection settings if available
                if (mappingData.beatDetection) {
                    this.beatDetection.enabled = mappingData.beatDetection.enabled || false;
                    this.beatDetection.threshold = mappingData.beatDetection.threshold || 1.3;
                    this.beatDetection.minTimeBetweenBeats = mappingData.beatDetection.minTimeBetweenBeats || 300;
                }
                
                // Load parameter mappings
                this.parameterMappings = mappingData.parameterMappings;
                
                // Update the UI
                this.populateFrequencyMappings();
                
                // Update beat detection controls if menu is open
                const beatToggle = document.getElementById('beatDetectionToggle');
                const beatThreshold = document.getElementById('beatThreshold');
                const beatThresholdValue = document.getElementById('beatThresholdValue');
                
                if (beatToggle) beatToggle.checked = this.beatDetection.enabled;
                if (beatThreshold) beatThreshold.value = this.beatDetection.threshold;
                if (beatThresholdValue) beatThresholdValue.textContent = this.beatDetection.threshold;
                
                const version = mappingData.version || 'unknown';
                const timestamp = mappingData.timestamp ? new Date(mappingData.timestamp).toLocaleString() : 'unknown';
                
                this.app.ui.updateStatus(`📁 Loaded audio mappings (v${version}, ${timestamp})`, 'success');
                
            } catch (error) {
                console.error('Error loading audio mappings:', error);
                this.app.ui.updateStatus(`❌ Failed to load mappings: ${error.message}`, 'error');
            }
        };
        
        // Trigger file selection
        input.click();
    }
    
    startEqualizerUpdates() {
        if (this.equalizerUpdateInterval) {
            clearInterval(this.equalizerUpdateInterval);
        }
        
        this.equalizerUpdateInterval = setInterval(() => {
            if (this.advancedMenuVisible && this.audioReactive) {
                this.updateEqualizerDisplay();
                this.updateAdvancedMicrophoneVolumeLevel();
            }
        }, 100); // 10 FPS update rate - less laggy
    }
    
    stopEqualizerUpdates() {
        if (this.equalizerUpdateInterval) {
            clearInterval(this.equalizerUpdateInterval);
            this.equalizerUpdateInterval = null;
        }
        
        // Event listener cleanup no longer needed - handled by main controls
    }
    
    // Get current audio system state for saving
    getState() {
        return {
            audioReactive: this.audioReactive,
            microphoneActive: this.microphoneActive,
            selectedMicrophoneId: this.selectedMicrophoneId,
            beatDetection: {
                enabled: this.beatDetection.enabled,
                threshold: this.beatDetection.threshold,
                minTimeBetweenBeats: this.beatDetection.minTimeBetweenBeats,
                historySize: this.beatDetection.historySize
            },
            parameterMappings: { ...this.parameterMappings }
        };
    }
    
    // Set audio system state from loaded data
    setState(state) {
        if (!state) return;
        
        // Restore basic audio settings
        if (state.audioReactive !== undefined) {
            this.audioReactive = state.audioReactive;
        }
        
        // Restore microphone settings (but don't auto-activate)
        if (state.selectedMicrophoneId !== undefined) {
            this.selectedMicrophoneId = state.selectedMicrophoneId;
        }
        
        // Restore beat detection settings
        if (state.beatDetection) {
            if (state.beatDetection.enabled !== undefined) {
                this.beatDetection.enabled = state.beatDetection.enabled;
            }
            if (state.beatDetection.threshold !== undefined) {
                this.beatDetection.threshold = state.beatDetection.threshold;
            }
            if (state.beatDetection.minTimeBetweenBeats !== undefined) {
                this.beatDetection.minTimeBetweenBeats = state.beatDetection.minTimeBetweenBeats;
            }
            if (state.beatDetection.historySize !== undefined) {
                this.beatDetection.historySize = state.beatDetection.historySize;
            }
        }
        
        // Restore parameter mappings
        if (state.parameterMappings) {
            this.parameterMappings = { ...state.parameterMappings };
        }
    }
}