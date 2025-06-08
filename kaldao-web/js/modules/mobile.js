// Mobile controls and gesture handling module
export class MobileControls {
    constructor() {
        this.app = null;
        
        // Touch gesture variables
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.isSwipeInProgress = false;
        this.longPressTimeout = null;
        this.longPressTriggered = false;
        this.initialParameterValue = 0; // Store initial value for fader behavior
        this.hasMoved = false; // Track if finger has moved during touch
        this.gestureType = null; // Track what type of gesture is happening
        this.userIsCurrentlyTouching = false; // Track if user is actively touching screen
        
        // Device orientation variables
        this.deviceTiltEnabled = false;
        this.baseOrientation = { beta: 0, gamma: 0 }; // Store neutral position
        this.orientationCalibrated = false;
        
        // Pinch gesture variables
        this.isPinching = false;
        this.initialPinchDistance = 0;
        this.initialZoomValue = 0;
        this.twoFingerTapStartTime = 0;
        this.twoFingerTapInitialDistance = 0;
        
        // Shake detection variables
        this.lastShakeTime = 0;
        this.shakeThreshold = 25; // Increased from 15 to require harder shake
        this.lastAcceleration = { x: 0, y: 0, z: 0 };
        this.shakeTimeout = null;
    }

    init(app) {
        this.app = app;
        this.setupMobileControls();
    }

    setupMobileControls() {
        // Touch events for gestures - attach to document for broader coverage
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        
        // Also attach to canvas as backup
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
            canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        }
        
        // Device motion for shake detection
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', (e) => this.handleDeviceMotion(e));
        }
        
        // Device orientation for tilt control
        if (window.DeviceOrientationEvent) {
            // Request permission for iOS 13+
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(response => {
                        if (response === 'granted') {
                            window.addEventListener('deviceorientation', (e) => this.handleDeviceOrientation(e));
                            this.deviceTiltEnabled = true;
                            this.app.ui.updateStatus('📱 Device tilt enabled for camera control', 'success');
                        }
                    })
                    .catch(console.error);
            } else {
                // For Android and older iOS
                window.addEventListener('deviceorientation', (e) => this.handleDeviceOrientation(e));
                this.deviceTiltEnabled = true;
                this.app.ui.updateStatus('📱 Device tilt enabled for camera control', 'success');
            }
        }
    }
    
    handleTouchStart(e) {
        // Allow menu interaction but handle menu toggle separately
        if (e.target.closest('.menu') && this.app.menuVisible) {
            // If tapping inside menu while it's visible, just close it
            e.preventDefault();
            this.app.ui.toggleMenu();
            return;
        }
        
        e.preventDefault();
        
        // Mark that user is currently touching
        this.userIsCurrentlyTouching = true;
        
        // Reset mobile UI timer on touch
        this.app.ui.resetMobileUITimer();
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchStartTime = Date.now();
            this.isSwipeInProgress = true;
            this.longPressTriggered = false;
            this.hasMoved = false;
            this.gestureType = null;
            this.isPinching = false;
            
            // Store initial parameter value for fader behavior
            const paramKeys = this.app.parameters.getParameterKeys();
            const paramKey = paramKeys[this.app.currentParameterIndex];
            this.initialParameterValue = this.app.parameters.getBaseValue(paramKey);
            
            // Start long press timer for reset all - only triggers if no movement
            this.longPressTimeout = setTimeout(() => {
                if (this.isSwipeInProgress && !this.longPressTriggered && !this.hasMoved) {
                    this.longPressTriggered = true;
                    this.app.resetAllParameters();
                    this.app.ui.updateStatus('🔄 Long press detected - All parameters reset!', 'success');
                    this.isSwipeInProgress = false;
                }
            }, 2000); // 2 seconds
        } else if (e.touches.length === 2) {
            // Two-finger gesture start
            this.isSwipeInProgress = false; // Cancel any ongoing swipe
            
            // Clear long press timeout
            if (this.longPressTimeout) {
                clearTimeout(this.longPressTimeout);
                this.longPressTimeout = null;
            }
            
            // Calculate initial distance between fingers
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) + 
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            // Store values for both pinch and tap detection
            this.initialPinchDistance = distance;
            this.twoFingerTapInitialDistance = distance;
            this.twoFingerTapStartTime = Date.now();
            this.initialZoomValue = this.app.parameters.getBaseValue('zoom_level');
            
            // Start as potential tap, will become pinch if fingers move
            this.isPinching = false;
        }
    }
    
    handleTouchMove(e) {
        // Don't handle gestures on menu elements
        if (e.target.closest('.menu')) {
            return;
        }
        
        e.preventDefault();
        
        // Handle two-finger gestures
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) + 
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            // Check if fingers have moved enough to be considered a pinch
            const distanceChange = Math.abs(currentDistance - this.twoFingerTapInitialDistance);
            if (distanceChange > 30 && !this.isPinching) {
                // Switch from potential tap to pinch gesture
                this.isPinching = true;
            }
            
            // Handle pinch zoom if we're in pinch mode
            if (this.isPinching) {
                // Calculate zoom change
                const distanceRatio = currentDistance / this.initialPinchDistance;
                const sensitivity = 0.6; // Adjust sensitivity (lower = less sensitive)
                let newZoom = this.initialZoomValue + (distanceRatio - 1.0) * sensitivity;
                
                // Clamp to zoom bounds
                const zoomParam = this.app.parameters.getParameter('zoom_level');
                newZoom = Math.max(zoomParam.min, Math.min(zoomParam.max, newZoom));
                newZoom = Math.round(newZoom / zoomParam.step) * zoomParam.step;
                
                this.app.parameters.setValue('zoom_level', newZoom);
                this.app.ui.updateDisplay();
            }
            return;
        }
        
        if (!this.isSwipeInProgress || e.touches.length !== 1 || this.isPinching) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        const deltaTime = Date.now() - this.touchStartTime;
        
        // Mark that finger has moved if movement exceeds threshold
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            this.hasMoved = true;
            
            // Cancel long press immediately once movement is detected
            if (this.longPressTimeout && !this.longPressTriggered) {
                clearTimeout(this.longPressTimeout);
                this.longPressTimeout = null;
            }
        }
        
        // Only process gestures if not in long press mode and finger has moved
        if (!this.longPressTriggered && this.hasMoved && deltaTime > 50) {
            // Determine gesture type if not already set
            if (!this.gestureType) {
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
                    this.gestureType = 'horizontal';
                } else if (Math.abs(deltaY) > 15) {
                    this.gestureType = 'vertical';
                }
            }
            
            // Handle horizontal swipe - parameter switching
            if (this.gestureType === 'horizontal') {
                if (deltaX > 0) {
                    this.app.switchParameter(1); // Right swipe - next parameter
                } else {
                    this.app.switchParameter(-1); // Left swipe - previous parameter
                }
                // Reset for immediate next gesture
                this.isSwipeInProgress = false;
                this.gestureType = null;
                this.hasMoved = false;
                
                // Update initial value for new parameter
                const paramKeys = this.app.parameters.getParameterKeys();
                const paramKey = paramKeys[this.app.currentParameterIndex];
                this.initialParameterValue = this.app.parameters.getBaseValue(paramKey);
            }
            
            // Handle vertical movement - fader adjustment
            else if (this.gestureType === 'vertical') {
                const paramKeys = this.app.parameters.getParameterKeys();
                const paramKey = paramKeys[this.app.currentParameterIndex];
                const param = this.app.parameters.getParameter(paramKey);
                
                // Adjust sensitivity based on parameter type
                let sensitivity = 300.0; // Default sensitivity
                if (paramKey === 'kaleidoscope_segments') {
                    sensitivity = 600.0; // Less sensitive for kaleidoscope segments
                } else if (paramKey === 'zoom_level') {
                    sensitivity = 500.0; // Less sensitive for zoom
                }
                
                const movementDelta = touch.clientY - this.touchStartY;
                const range = param.max - param.min;
                const deltaValue = (-movementDelta / sensitivity) * range;
                
                // Calculate new value relative to initial parameter value when gesture started
                let newValue = this.initialParameterValue + deltaValue;
                
                // Clamp to parameter bounds
                newValue = Math.max(param.min, Math.min(param.max, newValue));
                
                // Apply step rounding for discrete parameters
                if (paramKey === 'kaleidoscope_segments' || paramKey === 'layer_count') {
                    newValue = Math.round(newValue);
                    if (paramKey === 'kaleidoscope_segments') {
                        newValue = Math.round(newValue / 2) * 2; // Ensure even numbers
                    }
                } else {
                    newValue = Math.round(newValue / param.step) * param.step;
                }
                
                // Update parameter value
                this.app.parameters.setValue(paramKey, newValue);
                this.app.ui.updateDisplay();
            }
        }
    }
    
    handleTouchEnd(e) {
        // Don't handle gestures on menu elements
        if (e.target.closest('.menu')) {
            return;
        }
        
        e.preventDefault();
        
        // Clear long press timeout
        if (this.longPressTimeout) {
            clearTimeout(this.longPressTimeout);
            this.longPressTimeout = null;
        }
        
        // Check for two-finger tap (if no touches remain, it was a two-finger release)
        if (e.changedTouches.length === 2 && !this.isPinching && this.twoFingerTapStartTime > 0) {
            const tapDuration = Date.now() - this.twoFingerTapStartTime;
            
            // If it was a quick tap (less than 300ms), randomize colors
            if (tapDuration < 300) {
                this.app.randomizeColors();
                this.app.ui.updateStatus('🎨 Two-finger tap - Colors randomized!', 'success');
            }
        }
        
        if (this.isSwipeInProgress && !this.longPressTriggered) {
            const deltaTime = Date.now() - this.touchStartTime;
            
            // If it was a short tap without much movement, toggle menu
            if (deltaTime < 300 && !this.hasMoved) {
                this.app.ui.toggleMenu();
            }
            // For vertical fader gestures, update the initial value for next touch
            else if (this.gestureType === 'vertical') {
                // Update the initial value to current value for seamless continuation
                const paramKeys = this.app.parameters.getParameterKeys();
                const paramKey = paramKeys[this.app.currentParameterIndex];
                this.initialParameterValue = this.app.parameters.getBaseValue(paramKey);
            }
        }
        
        // Mark that user is no longer touching
        this.userIsCurrentlyTouching = false;
        
        // Reset all touch state for next gesture
        this.isSwipeInProgress = false;
        this.longPressTriggered = false;
        this.hasMoved = false;
        this.gestureType = null;
        this.isPinching = false;
        this.twoFingerTapStartTime = 0;
        this.twoFingerTapInitialDistance = 0;
        
        // Start fade timer now that user is not touching
        this.app.ui.resetMobileUITimer();
    }
    
    handleDeviceMotion(e) {
        if (!e.accelerationIncludingGravity) return;
        
        const acceleration = e.accelerationIncludingGravity;
        const currentTime = Date.now();
        
        // Calculate acceleration delta
        const deltaX = Math.abs(acceleration.x - this.lastAcceleration.x);
        const deltaY = Math.abs(acceleration.y - this.lastAcceleration.y);
        const deltaZ = Math.abs(acceleration.z - this.lastAcceleration.z);
        
        const totalDelta = deltaX + deltaY + deltaZ;
        
        // Detect shake
        if (totalDelta > this.shakeThreshold && currentTime - this.lastShakeTime > 1000) {
            this.lastShakeTime = currentTime;
            
            // Clear any existing timeout
            if (this.shakeTimeout) {
                clearTimeout(this.shakeTimeout);
            }
            
            // Debounce shake detection
            this.shakeTimeout = setTimeout(() => {
                this.app.randomizeParameters();
                this.app.ui.updateStatus('🎲 Shake detected - Parameters randomized!', 'success');
            }, 100);
        }
        
        this.lastAcceleration = {
            x: acceleration.x,
            y: acceleration.y,
            z: acceleration.z
        };
    }
    
    handleDeviceOrientation(e) {
        if (!this.deviceTiltEnabled) return;
        
        // Get orientation values (beta = front-to-back tilt, gamma = left-to-right tilt)
        const beta = e.beta;   // Front-to-back tilt (-180 to 180)
        const gamma = e.gamma; // Left-to-right tilt (-90 to 90)
        
        if (beta === null || gamma === null) return;
        
        // Calibrate on first reading or when user manually calibrates
        if (!this.orientationCalibrated) {
            this.baseOrientation.beta = beta;
            this.baseOrientation.gamma = gamma;
            this.orientationCalibrated = true;
            return;
        }
        
        // Calculate relative tilt from base position
        let relativeBeta = beta - this.baseOrientation.beta;
        let relativeGamma = gamma - this.baseOrientation.gamma;
        
        // Normalize to parameter range
        const tiltSensitivity = 0.3; // Adjust sensitivity (lower = less sensitive)
        const maxTilt = 30; // Maximum tilt angle in degrees
        
        // Map tilt to camera tilt parameters
        // X should be controlled by left/right tilt (gamma), Y by forward/back tilt (beta)
        const tiltX = Math.max(-10, Math.min(10, (relativeGamma / maxTilt) * 10 * tiltSensitivity));
        const tiltY = Math.max(-10, Math.min(10, (-relativeBeta / maxTilt) * 10 * tiltSensitivity)); // Inverted Y
        
        // Update camera tilt parameters
        this.app.parameters.setValue('camera_tilt_x', tiltX);
        this.app.parameters.setValue('camera_tilt_y', tiltY);
        
        // Update display if menu is visible (don't spam updates)
        if (this.app.menuVisible) {
            this.app.ui.updateDisplay();
        }
    }
    
    // Function to recalibrate device orientation
    calibrateOrientation() {
        if (this.deviceTiltEnabled) {
            this.orientationCalibrated = false;
            this.app.ui.updateStatus('📱 Device orientation calibrated', 'success');
        }
    }
}