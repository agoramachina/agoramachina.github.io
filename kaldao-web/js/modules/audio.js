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
                    this.app.ui.updateStatus(`⚠️ Audio loaded but autoplay blocked. Press A to play.`, 'info');
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
        if (!this.audioContext) {
            await this.initAudioContext();
        }
        
        if (this.microphoneActive) {
            this.stopMicrophone();
        } else {
            await this.startMicrophone();
        }
    }

    async startMicrophone() {
        try {
            this.app.ui.updateStatus('🎤 Requesting microphone access...', 'info');
            
            // Request microphone access
            this.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
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
            
            this.app.ui.updateStatus('🎤 Microphone active with reactivity!', 'success');
            this.app.ui.updateMenuDisplay();
            
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
            
        } catch (error) {
            console.error('Error stopping microphone:', error);
            this.app.ui.updateStatus('❌ Error stopping microphone', 'error');
        }
    }

    analyzeAudio() {
        if (!this.analyser || !this.audioData || !this.audioReactive || (!this.audioPlaying && !this.microphoneActive)) {
            return { bass: 0, mid: 0, treble: 0, overall: 0 };
        }
        
        this.analyser.getByteFrequencyData(this.audioData);
        
        // Frequency ranges (approximate for 44.1kHz sample rate)
        const bassRange = { start: 0, end: 32 };      // ~20-250Hz
        const midRange = { start: 32, end: 128 };     // ~250-2000Hz  
        const trebleRange = { start: 128, end: 256 }; // ~2000-8000Hz
        
        function getAverageVolume(range) {
            let sum = 0;
            for (let i = range.start; i < range.end && i < this.audioData.length; i++) {
                sum += this.audioData[i];
            }
            return sum / (range.end - range.start) / 255.0;
        }
        
        const bass = getAverageVolume.call(this, bassRange);
        const mid = getAverageVolume.call(this, midRange);
        const treble = getAverageVolume.call(this, trebleRange);
        const overall = (bass + mid + treble) / 3.0;
        
        return { bass, mid, treble, overall };
    }

    applyReactivity(parameters) {
        if (!this.audioReactive || (!this.audioPlaying && !this.microphoneActive)) {
            // Reset all modifiers to 1.0 when not reactive
            parameters.resetAudioModifiers();
            return;
        }
        
        const audioLevels = this.analyzeAudio();
        
        // Create dynamic multipliers based on audio
        const bassMultiplier = 1.0 + (audioLevels.bass * 0.8);      // 1.0 to 1.8x
        const midMultiplier = 1.0 + (audioLevels.mid * 0.4);        // 1.0 to 1.4x
        const trebleMultiplier = 1.0 + (audioLevels.treble * 0.3);  // 1.0 to 1.3x
        const overallMultiplier = 1.0 + (audioLevels.overall * 0.5); // 1.0 to 1.5x
        
        // Bass effects - make the center circle really pulse!
        parameters.setAudioModifier('center_fill_radius', bassMultiplier * 1.5); // Extra bass sensitivity for center
        parameters.setAudioModifier('truchet_radius', bassMultiplier);
        parameters.setAudioModifier('zoom_level', 1.0 + (audioLevels.bass * 0.3)); // Slight zoom pulse
        
        // Mid frequencies affect rotation and movement
        parameters.setAudioModifier('rotation_speed', midMultiplier);
        parameters.setAudioModifier('plane_rotation_speed', midMultiplier);
        parameters.setAudioModifier('fly_speed', 1.0 + (audioLevels.mid * 0.6));
        
        // Treble affects visual complexity and color
        parameters.setAudioModifier('kaleidoscope_segments', trebleMultiplier);
        parameters.setAudioModifier('color_intensity', trebleMultiplier);
        parameters.setAudioModifier('color_speed', trebleMultiplier);
        
        // Overall volume affects contrast and layer count
        parameters.setAudioModifier('contrast', overallMultiplier);
        parameters.setAudioModifier('layer_count', 1.0 + (audioLevels.overall * 0.3));
        
        // Path effects for more dynamic movement
        parameters.setAudioModifier('path_scale', 1.0 + (audioLevels.overall * 0.4));
    }

    isReactive() {
        return this.audioReactive && (this.audioPlaying || this.microphoneActive);
    }
}