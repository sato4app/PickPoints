class PickPoints {
    constructor() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.currentImage = null;
        this.inputElements = [];
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        const imageInput = document.getElementById('imageInput');
        const clearBtn = document.getElementById('clearBtn');
        const exportBtn = document.getElementById('exportBtn');
        
        imageInput.addEventListener('change', (e) => this.handleImageLoad(e));
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        clearBtn.addEventListener('click', () => this.clearPoints());
        exportBtn.addEventListener('click', () => this.exportJSON());
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
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    setupCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 40;
        const maxWidth = Math.min(containerWidth, 800);
        
        const aspectRatio = this.currentImage.height / this.currentImage.width;
        const canvasWidth = maxWidth;
        const canvasHeight = maxWidth * aspectRatio;
        
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        this.canvas.style.width = canvasWidth + 'px';
        this.canvas.style.height = canvasHeight + 'px';
        this.canvas.style.display = 'block';
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
        
        this.addPoint(x, y);
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
    
    drawPoint(point) {
        this.ctx.fillStyle = '#ff0000';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawAllPoints() {
        this.points.forEach(point => this.drawPoint(point));
        this.redrawInputBoxes();
    }
    
    clearPoints() {
        this.points = [];
        this.clearInputBoxes();
        this.drawImage();
        this.updatePointCount();
    }
    
    updatePointCount() {
        document.getElementById('pointCount').textContent = this.points.length;
    }
    
    enableControls() {
        document.getElementById('clearBtn').disabled = false;
        document.getElementById('exportBtn').disabled = false;
    }
    
    exportJSON() {
        if (this.points.length === 0) {
            alert('ポイントが選択されていません');
            return;
        }
        
        const data = {
            totalPoints: this.points.length,
            imageInfo: {
                width: this.canvas.width,
                height: this.canvas.height
            },
            points: this.points.map((point, index) => ({
                index: index + 1,
                id: point.id || '',
                x: point.x,
                y: point.y
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
}

    createInputBox(point, index) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.canvas.width;
        const scaleY = rect.height / this.canvas.height;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 4;
        input.className = 'point-id-input';
        input.placeholder = 'ID';
        
        const inputX = this.findOptimalInputPosition(point.x, point.y, scaleX, rect.left);
        const inputY = point.y * scaleY + rect.top - 15;
        
        input.style.position = 'absolute';
        input.style.left = inputX + 'px';
        input.style.top = inputY + 'px';
        input.style.zIndex = '1000';
        
        input.addEventListener('input', (e) => {
            this.points[index].id = e.target.value;
        });
        
        document.body.appendChild(input);
        this.inputElements.push(input);
        
        setTimeout(() => input.focus(), 100);
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
        this.points.forEach((point, index) => {
            this.createInputBox(point, index);
            const input = this.inputElements[this.inputElements.length - 1];
            input.value = point.id || '';
        });
    }
    
    clearInputBoxes() {
        this.inputElements.forEach(input => {
            if (input && input.parentNode) {
                input.parentNode.removeChild(input);
            }
        });
        this.inputElements = [];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PickPoints();
});