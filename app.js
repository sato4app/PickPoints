class PickPoints {
    constructor() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.currentImage = null;
        this.inputElements = [];
        this.routeMode = false;
        this.routePoints = [];
        this.startPointId = '';
        this.endPointId = '';
        this.currentLayout = 'sidebar';
        
        this.initializeEventListeners();
        this.initializeLayoutManager();
    }
    
    initializeEventListeners() {
        const imageInput = document.getElementById('imageInput');
        const clearBtn = document.getElementById('clearBtn');
        const exportBtn = document.getElementById('exportBtn');
        const jsonInput = document.getElementById('jsonInput');
        const startRouteBtn = document.getElementById('startRouteBtn');
        const endRouteBtn = document.getElementById('endRouteBtn');
        const exportRouteBtn = document.getElementById('exportRouteBtn');
        const routeJsonInput = document.getElementById('routeJsonInput');
        const startPointInput = document.getElementById('startPoint');
        const endPointInput = document.getElementById('endPoint');
        
        
        
        imageInput.addEventListener('change', (e) => this.handleImageLoad(e));
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearPoints();
        });
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportJSON();
        });
        jsonInput.addEventListener('change', (e) => this.handleJSONLoad(e));
        startRouteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.startRouteMode();
        });
        endRouteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.endRouteMode();
        });
        exportRouteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportRouteJSON();
        });
        routeJsonInput.addEventListener('change', (e) => this.handleRouteJSONLoad(e));
        startPointInput.addEventListener('input', (e) => this.updateRouteButtons());
        endPointInput.addEventListener('input', (e) => this.updateRouteButtons());
        
        // Layout radio buttons
        const layoutRadios = document.querySelectorAll('input[name="layout"]');
        layoutRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.setLayout(e.target.value);
                }
            });
        });
    }
    
    handleImageLoad(event) {
        const file = event.target.files[0];
        if (!file || !file.type.includes('png')) {
            alert('PNG画像ファイルを選択してください');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.setupCanvas();
                this.drawImage();
                this.enableControls();
            };
            img.onerror = () => {
                alert('画像の読み込みに失敗しました');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    handleJSONLoad(event) {
        const file = event.target.files[0];
        if (!file || !file.type.includes('json')) {
            alert('JSONファイルを選択してください');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                this.loadPointsFromJSON(jsonData);
            } catch (error) {
                alert('JSONファイルの形式が正しくありません');
                console.error('JSON parse error:', error);
            }
        };
        reader.readAsText(file);
        
        event.target.value = '';
    }
    
    loadPointsFromJSON(data) {
        if (!this.currentImage) {
            alert('先に画像を読み込んでください');
            return;
        }
        
        if (!data.points || !Array.isArray(data.points)) {
            alert('JSONファイルにポイントデータが見つかりません');
            return;
        }
        
        const scaleX = this.canvas.width / this.currentImage.width;
        const scaleY = this.canvas.height / this.currentImage.height;
        
        data.points.forEach(pointData => {
            if (pointData.x !== undefined && pointData.y !== undefined) {
                const point = {
                    x: Math.round(pointData.x * scaleX),
                    y: Math.round(pointData.y * scaleY),
                    id: pointData.id || ''
                };
                this.points.push(point);
                this.createInputBox(point, this.points.length - 1);
            }
        });
        
        this.drawImage();
        this.updatePointCount();
    }
    
    
    drawImage() {
        if (!this.currentImage) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.drawImage(this.currentImage, 0, 0, this.canvas.width, this.canvas.height);
        
        this.drawAllPoints();
    }
    
    handleCanvasClick(event) {
        if (!this.currentImage) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
        
        if (this.routeMode) {
            this.addRoutePoint(x, y);
        } else {
            this.addPoint(x, y);
        }
    }
    
    addPoint(x, y) {
        const point = { 
            x: Math.round(x), 
            y: Math.round(y),
            id: ''
        };
        this.points.push(point);
        this.drawPoint(point);
        this.createInputBox(point, this.points.length - 1);
        this.updatePointCount();
    }
    
    drawPoint(point, color = '#ff0000', radius = 4, strokeWidth = 1.5) {
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = strokeWidth;
        
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawAllPoints() {
        this.points.forEach((point, index) => {
            let color = '#ff0000';
            let radius = 4;
            let strokeWidth = 1.5;
            
            if (this.routeMode && (point.id === this.startPointId || point.id === this.endPointId)) {
                color = '#0066ff';
            } else if (point.isMarker) {
                // Blue markers from loaded JSON: size 3, stroke 1
                color = '#0066ff';
                radius = 3;
                strokeWidth = 1;
            }
            
            this.drawPoint(point, color, radius, strokeWidth);
        });
        
        this.routePoints.forEach(point => {
            this.drawPoint(point, '#ff8800');
        });
        
        if (!this.routeMode) {
            this.redrawInputBoxes();
        }
    }
    
    clearPoints() {
        this.points = [];
        this.clearInputBoxes();
        this.drawImage();
        this.updatePointCount();
    }
    
    updatePointCount() {
        // Count only non-marker points (exclude waypoints loaded from JSON)
        const nonMarkerPoints = this.points.filter(point => !point.isMarker);
        document.getElementById('pointCount').textContent = nonMarkerPoints.length;
    }
    
    enableControls() {
        document.getElementById('clearBtn').disabled = false;
        document.getElementById('exportBtn').disabled = false;
        this.updateRouteButtons();
    }
    
    exportJSON() {
        if (this.points.length === 0) {
            alert('ポイントが選択されていません');
            return;
        }
        
        const scaleX = this.currentImage.width / this.canvas.width;
        const scaleY = this.currentImage.height / this.canvas.height;
        
        const data = {
            totalPoints: this.points.length,
            imageInfo: {
                width: this.currentImage.width,
                height: this.currentImage.height
            },
            points: this.points.map((point, index) => ({
                index: index + 1,
                id: point.id || '',
                x: Math.round(point.x * scaleX),
                y: Math.round(point.y * scaleY)
            })),
            exportedAt: new Date().toISOString()
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pickpoints_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    createInputBox(point, index) {
        // Skip creating input boxes for marker points
        if (point.isMarker) {
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 4;
        input.className = 'point-id-input';
        input.placeholder = 'ID';
        
        input.style.position = 'absolute';
        input.style.zIndex = '1000';
        
        this.positionInputBox(input, point);
        
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            const uppercaseValue = value.replace(/[a-z]/g, (match) => match.toUpperCase());
            this.points[index].id = uppercaseValue;
            if (uppercaseValue !== value) {
                e.target.value = uppercaseValue;
            }
        });
        
        input.addEventListener('blur', (e) => {
            const value = e.target.value.trim();
            // Don't remove marker points (loaded from JSON) even if ID is blank
            if (value === '' && !this.points[index].isMarker) {
                this.removePoint(index);
                return;
            }
        });
        
        document.body.appendChild(input);
        this.inputElements.push(input);
        
        setTimeout(() => input.focus(), 100);
    }
    
    positionInputBox(input, point) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.canvas.width;
        const scaleY = rect.height / this.canvas.height;
        
        const inputX = this.findOptimalInputPosition(point.x, point.y, scaleX, rect.left);
        const inputY = point.y * scaleY + rect.top - 15;
        
        input.style.left = inputX + 'px';
        input.style.top = inputY + 'px';
    }
    
    findOptimalInputPosition(pointX, pointY, scaleX, canvasLeft) {
        const inputWidth = 50;
        const margin = 10;
        const scaledPointX = pointX * scaleX + canvasLeft;
        
        const rightPos = scaledPointX + margin;
        const leftPos = scaledPointX - inputWidth - margin;
        
        if (rightPos + inputWidth < window.innerWidth - 20) {
            return rightPos;
        } else {
            return Math.max(leftPos, canvasLeft + 5);
        }
    }
    
    redrawInputBoxes() {
        this.clearInputBoxes();
        setTimeout(() => {
            this.points.forEach((point, index) => {
                // Skip creating input boxes for marker points
                if (point.isMarker) {
                    return;
                }
                this.createInputBox(point, index);
                const input = this.inputElements[this.inputElements.length - 1];
                if (input) {
                    input.value = point.id || '';
                }
            });
        }, 10);
    }
    
    clearInputBoxes() {
        this.inputElements.forEach(input => {
            if (input && input.parentNode) {
                input.parentNode.removeChild(input);
            }
        });
        this.inputElements = [];
    }
    
    removePoint(index) {
        this.points.splice(index, 1);
        this.clearInputBoxes();
        this.drawImage();
        this.updatePointCount();
    }
    
    updateRouteButtons() {
        const startPoint = document.getElementById('startPoint').value.trim();
        const endPoint = document.getElementById('endPoint').value.trim();
        const hasImage = this.currentImage !== null;
        
        document.getElementById('startRouteBtn').disabled = !hasImage || !startPoint || !endPoint || this.routeMode;
        document.getElementById('endRouteBtn').disabled = !this.routeMode;
        document.getElementById('exportRouteBtn').disabled = !this.routeMode || this.routePoints.length === 0;
    }
    
    startRouteMode() {
        this.startPointId = document.getElementById('startPoint').value.trim();
        this.endPointId = document.getElementById('endPoint').value.trim();
        
        if (!this.startPointId || !this.endPointId) {
            alert('開始ポイントと終了ポイントを入力してください');
            return;
        }
        
        this.routeMode = true;
        this.routePoints = [];
        this.updateWaypointCount();
        this.hideAllInputBoxes();
        this.drawImage();
        this.updateRouteButtons();
    }
    
    endRouteMode() {
        this.routeMode = false;
        this.showAllInputBoxes();
        this.drawImage();
        this.updateRouteButtons();
    }
    
    updateWaypointCount() {
        document.getElementById('waypointCount').textContent = this.routePoints.length;
    }
    
    hideAllInputBoxes() {
        this.inputElements.forEach(input => {
            if (input && input.style) {
                input.style.display = 'none';
            }
        });
    }
    
    showAllInputBoxes() {
        this.inputElements.forEach(input => {
            if (input && input.style) {
                input.style.display = 'block';
            }
        });
        // Redraw input boxes to ensure they are positioned correctly
        this.redrawInputBoxes();
    }
    
    exportRouteJSON() {
        if (this.routePoints.length === 0) {
            alert('ルートポイントが選択されていません');
            return;
        }
        
        const startPoint = this.points.find(p => p.id === this.startPointId);
        const endPoint = this.points.find(p => p.id === this.endPointId);
        
        if (!startPoint || !endPoint) {
            alert('開始ポイントまたは終了ポイントが見つかりません');
            return;
        }
        
        const scaleX = this.currentImage.width / this.canvas.width;
        const scaleY = this.currentImage.height / this.canvas.height;
        
        const routeData = {
            routeInfo: {
                startPoint: this.startPointId,
                endPoint: this.endPointId,
                waypointCount: this.routePoints.length
            },
            imageInfo: {
                width: this.currentImage.width,
                height: this.currentImage.height
            },
            points: [
                { type: 'start', id: this.startPointId, x: Math.round(startPoint.x * scaleX), y: Math.round(startPoint.y * scaleY) },
                ...this.routePoints.map((point, index) => ({
                    type: 'waypoint',
                    index: index + 1,
                    x: Math.round(point.x * scaleX),
                    y: Math.round(point.y * scaleY)
                })),
                { type: 'end', id: this.endPointId, x: Math.round(endPoint.x * scaleX), y: Math.round(endPoint.y * scaleY) }
            ],
            exportedAt: new Date().toISOString()
        };
        
        const jsonString = JSON.stringify(routeData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `route_${this.startPointId}_to_${this.endPointId}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    addRoutePoint(x, y) {
        const point = { 
            x: Math.round(x), 
            y: Math.round(y)
        };
        this.routePoints.push(point);
        this.drawPoint(point, '#ff8800');
        this.updateWaypointCount();
        this.updateRouteButtons();
    }
    
    handleRouteJSONLoad(event) {
        const file = event.target.files[0];
        if (!file || !file.type.includes('json')) {
            alert('JSONファイルを選択してください');
            return;
        }
        
        if (!this.currentImage) {
            alert('先に画像を読み込んでください');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                this.loadRouteFromJSON(jsonData);
            } catch (error) {
                alert('JSONファイルの形式が正しくありません');
                console.error('JSON parse error:', error);
            }
        };
        reader.readAsText(file);
        
        event.target.value = '';
    }
    
    loadRouteFromJSON(data) {
        if (!data.points || !Array.isArray(data.points) || !data.routeInfo) {
            alert('ルートJSONファイルの形式が正しくありません');
            return;
        }
        
        const scaleX = this.canvas.width / this.currentImage.width;
        const scaleY = this.canvas.height / this.currentImage.height;
        
        // Set route info in the input fields
        if (data.routeInfo.startPoint) {
            document.getElementById('startPoint').value = data.routeInfo.startPoint;
        }
        if (data.routeInfo.endPoint) {
            document.getElementById('endPoint').value = data.routeInfo.endPoint;
        }
        if (data.routeInfo.waypointCount !== undefined) {
            document.getElementById('waypointCount').textContent = data.routeInfo.waypointCount;
        }
        
        const startPointId = data.routeInfo.startPoint;
        const endPointId = data.routeInfo.endPoint;
        
        data.points.forEach(pointData => {
            if (pointData.x !== undefined && pointData.y !== undefined) {
                // Skip start and end points (they should not be registered as markers)
                if (pointData.type === 'start' || pointData.type === 'end') {
                    return;
                }
                
                // Skip if ID matches start or end point IDs (but allow blank IDs)
                if (pointData.id && (pointData.id === startPointId || pointData.id === endPointId)) {
                    return;
                }
                
                // Create marker point with blue color, size 3, stroke 1
                // Include waypoints and any other points, even with blank ID
                // No input box needed for markers
                const point = {
                    x: Math.round(pointData.x * scaleX),
                    y: Math.round(pointData.y * scaleY),
                    id: pointData.id || '',
                    isMarker: true
                };
                this.points.push(point);
            }
        });
        
        this.drawImage();
        this.updatePointCount();
    }
    
    initializeLayoutManager() {
        this.updateLayoutDisplay();
        
        // Handle window resize for responsive canvas sizing
        window.addEventListener('resize', () => {
            if (this.currentImage) {
                setTimeout(() => {
                    this.setupCanvas();
                    this.drawImage();
                }, 100);
            }
        });
    }
    
    setLayout(layout) {
        this.currentLayout = layout;
        this.updateLayoutDisplay();
        
        if (this.currentImage) {
            setTimeout(() => {
                this.setupCanvas();
                this.drawImage();
            }, 300);
        }
    }
    
    updateLayoutDisplay() {
        const mainContent = document.querySelector('.main-content');
        mainContent.setAttribute('data-layout', this.currentLayout);
        
        // Update radio button to match current layout
        const radio = document.querySelector(`input[name="layout"][value="${this.currentLayout}"]`);
        if (radio) {
            radio.checked = true;
        }
    }
    
    setupCanvas() {
        if (!this.currentImage) return;
        
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        let availableWidth, availableHeight;
        
        if (this.currentLayout === 'sidebar') {
            availableWidth = containerRect.width - 40;
            availableHeight = window.innerHeight - 140;
        } else {
            availableWidth = window.innerWidth - 40;
            availableHeight = window.innerHeight - 140;
        }
        
        const imageAspectRatio = this.currentImage.height / this.currentImage.width;
        
        let canvasWidth = availableWidth;
        let canvasHeight = canvasWidth * imageAspectRatio;
        
        if (canvasHeight > availableHeight) {
            canvasHeight = availableHeight;
            canvasWidth = canvasHeight / imageAspectRatio;
        }
        
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        this.canvas.style.width = canvasWidth + 'px';
        this.canvas.style.height = canvasHeight + 'px';
        this.canvas.style.display = 'block';
        this.canvas.style.visibility = 'visible';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PickPoints();
});