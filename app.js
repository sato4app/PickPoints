class PickPoints {
    constructor() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.currentImage = null;
        
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
        const containerWidth = this.canvas.parentElement.clientWidth;
        const maxWidth = Math.min(containerWidth - 40, 800);
        
        const aspectRatio = this.currentImage.height / this.currentImage.width;
        this.canvas.width = maxWidth;
        this.canvas.height = maxWidth * aspectRatio;
        
        this.canvas.style.width = maxWidth + 'px';
        this.canvas.style.height = (maxWidth * aspectRatio) + 'px';
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
        const point = { x: Math.round(x), y: Math.round(y) };
        this.points.push(point);
        this.drawPoint(point);
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
    }
    
    clearPoints() {
        this.points = [];
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
                id: index + 1,
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

document.addEventListener('DOMContentLoaded', () => {
    new PickPoints();
});