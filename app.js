/**
 * PickPoints - ハイキングマップポイント選択ツール
 * PNG画像からポイントを選択してJSON出力するWebアプリケーション
 */
class PickPoints {
    /**
     * アプリケーション初期化とプロパティ設定
     */
    constructor() {
        // Canvas要素とコンテキストを取得
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // データ保存用プロパティ
        this.points = [];              // ポイント編集モードのポイント配列
        this.currentImage = null;      // 現在読み込まれている画像
        this.currentImageFileName = ''; // 現在読み込まれている画像のファイル名
        this.inputElements = [];       // 動的に生成された入力フィールド配列
        this.routePoints = [];         // ルート編集モードの中間点配列
        this.startPointId = '';        // ルートの開始ポイントID
        this.endPointId = '';          // ルートの終了ポイントID
        
        // UI状態管理プロパティ
        this.currentLayout = 'sidebar';    // レイアウト設定（sidebar/overlay）
        this.currentEditingMode = 'point'; // 編集モード（point/route）
        
        // 初期化メソッド実行
        this.initializeEventListeners();
        this.initializeLayoutManager();
    }
    
    /**
     * 全てのDOM要素にイベントリスナーを設定
     */
    initializeEventListeners() {
        // DOM要素を取得
        const imageInput = document.getElementById('imageInput');
        const clearBtn = document.getElementById('clearBtn');
        const exportBtn = document.getElementById('exportBtn');
        const jsonInput = document.getElementById('jsonInput');
        const clearRouteBtn = document.getElementById('clearRouteBtn');
        const exportRouteBtn = document.getElementById('exportRouteBtn');
        const routeJsonInput = document.getElementById('routeJsonInput');
        const startPointInput = document.getElementById('startPointInput');
        const endPointInput = document.getElementById('endPointInput');
        
        // 基本操作のイベントリスナー
        imageInput.addEventListener('change', (e) => this.handleImageLoad(e));
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        // ポイント編集用のボタンイベント
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearPoints();
        });
        
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportJSON();
        });
        
        // JSON読み込み処理
        jsonInput.addEventListener('change', (e) => this.handleJSONLoad(e));
        
        // ルート編集用のボタンイベント
        clearRouteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearRoute();
        });
        
        exportRouteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportRouteJSON();
        });
        
        routeJsonInput.addEventListener('change', (e) => this.handleRouteJSONLoad(e));
        
        // 開始・終了ポイントの入力フィールドイベント（自動大文字変換と再描画）
        startPointInput.addEventListener('input', (e) => {
            const value = e.target.value.replace(/[a-z]/g, (match) => match.toUpperCase());
            this.startPointId = value;
            e.target.value = value;
            this.drawImage();
        });
        
        endPointInput.addEventListener('input', (e) => {
            const value = e.target.value.replace(/[a-z]/g, (match) => match.toUpperCase());
            this.endPointId = value;
            e.target.value = value;
            this.drawImage();
        });
        
        // レイアウト選択ラジオボタンのイベント
        const layoutRadios = document.querySelectorAll('input[name=\"layout\"]');
        layoutRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.setLayout(e.target.value);
                }
            });
        });
        
        // 編集モード選択ラジオボタンのイベント
        const editingModeRadios = document.querySelectorAll('input[name=\"editingMode\"]');
        editingModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.setEditingMode(e.target.value);
                }
            });
        });
    }
    
    /**
     * PNG画像ファイルの読み込み処理
     */
    handleImageLoad(event) {
        // ファイル選択の検証
        const file = event.target.files[0];
        if (!file || !file.type.includes('png')) {
            alert('PNG画像ファイルを選択してください');
            return;
        }
        
        // ファイル名を保存（拡張子を除く）
        this.currentImageFileName = file.name.replace(/\.png$/i, '');
        
        // FileReaderを使用して画像を読み込み
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            // 画像読み込み成功時の処理
            img.onload = () => {
                this.currentImage = img;
                this.setupCanvas();
                this.drawImage();
                this.enableControls();
                this.setEditingMode('point');  // デフォルトでポイント編集モードに設定
                
                // 画像と同じフォルダから対応するJSONファイルを読み込むよう促す
                this.promptForJSONLoad(file);
            };
            // 画像読み込み失敗時のエラーハンドリング
            img.onerror = () => {
                alert('画像の読み込みに失敗しました');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    /**
     * 画像と同じフォルダからJSONファイルを読み込むよう促す
     */
    promptForJSONLoad(imageFile) {
        // 自動的にJSONファイル選択ダイアログを開く
        const jsonInput = document.getElementById('jsonInput');
        if (jsonInput) {
            jsonInput.click();
        }
    }
    
    /**
     * JSONファイルの読み込み処理（ポイントデータ）
     */
    handleJSONLoad(event) {
        // ファイル形式の検証
        const file = event.target.files[0];
        if (!file || !file.type.includes('json')) {
            alert('JSONファイルを選択してください');
            return;
        }
        
        // JSONファイルを読み込んでパース
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
        
        // ファイル選択をクリア（同じファイルを再選択可能にする）
        event.target.value = '';
    }
    
    /**
     * JSONデータからポイントを復元して画面に配置
     */
    loadPointsFromJSON(data) {
        // 画像が読み込まれているかチェック
        if (!this.currentImage) {
            alert('先に画像を読み込んでください');
            return;
        }
        
        // JSONデータの形式チェック
        if (!data.points || !Array.isArray(data.points)) {
            alert('JSONファイルにポイントデータが見つかりません');
            return;
        }
        
        // 座標変換用のスケール計算
        const scaleX = this.canvas.width / this.currentImage.width;
        const scaleY = this.canvas.height / this.currentImage.height;
        
        // JSONからポイントデータを復元
        data.points.forEach(pointData => {
            if (pointData.x !== undefined && pointData.y !== undefined) {
                // 元画像座標からキャンバス座標に変換
                const point = {
                    x: Math.round(pointData.x * scaleX),
                    y: Math.round(pointData.y * scaleY),
                    id: pointData.id || '',
                    isMarker: pointData.isMarker || false
                };
                this.points.push(point);
                this.createInputBox(point, this.points.length - 1);
            }
        });
        
        // 画面を更新
        this.drawImage();
        this.updatePointCount();
        
        // フォーカスをクリア
        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }
    }
    
    /**
     * 画像とポイントをCanvasに描画
     */
    drawImage() {
        if (!this.currentImage) return;
        
        // キャンバスをクリアして画像を描画
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.currentImage, 0, 0, this.canvas.width, this.canvas.height);
        
        // 全ポイントを描画
        this.drawAllPoints();
    }
    
    /**
     * キャンバスクリック時の処理（ポイント追加）
     */
    handleCanvasClick(event) {
        if (!this.currentImage) return;
        
        // マウス座標をキャンバス座標に変換
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
        
        // 編集モードに応じて適切なポイント追加メソッドを実行
        if (this.currentEditingMode === 'route') {
            this.addRoutePoint(x, y);
        } else if (this.currentEditingMode === 'point') {
            // 直前に追加された未入力ポイントがあれば破棄してから新規追加
            this.removeTrailingEmptyUserPoints();
            // 入力欄にフォーカスする新規ポイント追加
            this.addPoint(x, y, /*focusInput*/ true);
        }
    }
    
    /**
     * ポイント編集モードでのポイント追加
     */
    addPoint(x, y, focusInput = false) {
        // 新しいポイントオブジェクトを作成
        const point = { 
            x: Math.round(x), 
            y: Math.round(y),
            id: '',
            isMarker: false
        };
        
        // ポイントを配列に追加し、画面に表示
        this.points.push(point);
        this.drawPoint(point);
        this.createInputBox(point, this.points.length - 1, focusInput);
        this.updatePointCount();
    }
    
    /**
     * 単一ポイントを指定色・サイズで描画
     */
    drawPoint(point, color = '#ff0000', radius = 4, strokeWidth = 1.5) {
        // 描画スタイルを設定
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = strokeWidth;
        
        // 円を描画（塗りつぶし + 白い縁取り）
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    /**
     * 全ポイント（通常ポイント・ルートポイント）を一括描画
     */
    drawAllPoints() {
        // 通常ポイントの描画（色・サイズを状態に応じて設定）
        this.points.forEach((point) => {
            let color = '#ff0000';      // デフォルト：赤
            let radius = 4;
            let strokeWidth = 1.5;
            
            // 開始・終了ポイントは青色で表示（ルート編集モード時またはstartPointId/endPointIdが設定されている場合）
            if ((this.currentEditingMode === 'route' || this.startPointId || this.endPointId) && 
                (point.id === this.startPointId || point.id === this.endPointId)) {
                color = '#0066ff';
            } else if (point.isMarker) {
                // JSONから読み込まれたマーカーは小さい青円で表示
                color = '#0066ff';
                radius = 3;
                strokeWidth = 1;
            }
            
            this.drawPoint(point, color, radius, strokeWidth);
        });
        
        // ルートの中間点を青色で描画（半径3px、白枠1px）
        this.routePoints.forEach(point => {
            this.drawPoint(point, '#0066ff', 3, 1);
        });
        
        // ポイント編集モードの場合のみ入力ボックスを再描画
        if (this.currentEditingMode === 'point') {
            this.redrawInputBoxes();
        }
    }
    
    /**
     * 全ポイントをクリア（ポイント編集モード）
     */
    clearPoints() {
        this.points = [];
        this.clearInputBoxes();
        this.drawImage();
        this.updatePointCount();
    }
    
    /**
     * ポイント数表示を更新（マーカー除外）
     */
    updatePointCount() {
        // マーカーポイントを除外してカウント
        const userPoints = this.points.filter(point => !point.isMarker);
        document.getElementById('pointCount').textContent = userPoints.length;
    }
    
    /**
     * 画像読み込み後にボタンを有効化
     */
    enableControls() {
        document.getElementById('clearBtn').disabled = false;
        document.getElementById('exportBtn').disabled = false;
    }
    
    /**
     * ポイントデータをJSON形式で出力・ダウンロード
     */
    exportJSON() {
        // ポイントが選択されているかチェック
        if (this.points.length === 0) {
            alert('ポイントが選択されていません');
            return;
        }
        
        // キャンバス座標を元画像座標に変換するスケール計算
        const scaleX = this.currentImage.width / this.canvas.width;
        const scaleY = this.currentImage.height / this.canvas.height;
        
        // JSONデータ構造を作成
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
                y: Math.round(point.y * scaleY),
                isMarker: point.isMarker || false
            })),
            exportedAt: new Date().toISOString()
        };
        
        // ユーザーがファイルを指定してダウンロード
        this.downloadJSONWithUserChoice(data, 'points');
    }
    
    /**
     * ポイント用のID入力ボックスを動的生成
     */
    createInputBox(point, index, shouldFocus = false) {
        // マーカーポイントには入力ボックスを作成しない
        if (point.isMarker) {
            return;
        }
        
        // 入力要素を作成・設定
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 4;
        input.className = 'point-id-input';
        input.placeholder = 'ID';
        input.style.position = 'absolute';
        input.style.zIndex = '1000';
        
        // ポイント位置に応じて入力ボックスを配置
        this.positionInputBox(input, point);
        
        // 入力時の処理（小文字を大文字に自動変換）
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            const uppercaseValue = value.replace(/[a-z]/g, (match) => match.toUpperCase());
            this.points[index].id = uppercaseValue;
            if (uppercaseValue !== value) {
                e.target.value = uppercaseValue;
            }
        });
        
        // フォーカス離脱時の処理（空白時はポイント削除）
        input.addEventListener('blur', (e) => {
            const value = e.target.value.trim();
            // 座標を使って現在のポイントインデックスを特定
            const currentIndex = this.points.findIndex(p => p.x === point.x && p.y === point.y);
            
            // ポイント編集モードでID名が空白の場合はポイントを削除
            if (value === '' && this.currentEditingMode === 'point') {
                if (currentIndex >= 0) {
                    this.removePoint(currentIndex);
                }
                return;
            }
            
            // IDを更新
            if (currentIndex >= 0) {
                this.points[currentIndex].id = value;
            }
        });
        
        // DOMに要素を追加
        document.body.appendChild(input);
        this.inputElements.push(input);

        // 新規作成時は入力にフォーカスして、他をクリックした際にblurで未入力ポイントが削除されるようにする
        if (shouldFocus && (point.id ?? '') === '' && this.currentEditingMode === 'point') {
            setTimeout(() => input.focus(), 0);
        }
    }
    
    /**
     * 入力ボックスの最適な表示位置を計算・設定
     */
    positionInputBox(input, point) {
        // キャンバスの位置とスケールを取得
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.canvas.width;
        const scaleY = rect.height / this.canvas.height;
        
        // 最適な横位置を計算（画面端を考慮）
        const inputX = this.findOptimalInputPosition(point.x, point.y, scaleX, rect.left);
        const inputY = point.y * scaleY + rect.top - 15;  // ポイントの少し上に配置
        
        // 位置を設定
        input.style.left = inputX + 'px';
        input.style.top = inputY + 'px';
    }
    
    /**
     * 画面端を考慮した入力ボックスの横位置計算
     */
    findOptimalInputPosition(pointX, pointY, scaleX, canvasLeft) {
        const inputWidth = 50;
        const margin = 10;
        const scaledPointX = pointX * scaleX + canvasLeft;
        
        // 右側配置と左側配置の位置を計算
        const rightPos = scaledPointX + margin;
        const leftPos = scaledPointX - inputWidth - margin;
        
        // 画面右端に収まるかチェックして最適位置を決定
        if (rightPos + inputWidth < window.innerWidth - 20) {
            return rightPos;
        } else {
            return Math.max(leftPos, canvasLeft + 5);
        }
    }
    
    /**
     * 全入力ボックスをクリア・再作成
     */
    redrawInputBoxes() {
        this.clearInputBoxes();
        // 少し遅延させてDOM更新を確実にする
        setTimeout(() => {
            this.points.forEach((point, index) => {
                if (point.isMarker) {
                    return;
                }
                // 入力ボックスを再作成
                this.createInputBox(point, index);
                const input = this.inputElements[this.inputElements.length - 1];
                if (input) {
                    input.value = point.id || '';
                }
            });
        }, 10);
    }
    
    /**
     * 全ての動的入力ボックスをDOMから削除
     */
    clearInputBoxes() {
        this.inputElements.forEach(input => {
            if (input && input.parentNode) {
                input.parentNode.removeChild(input);
            }
        });
        this.inputElements = [];
    }
    
    /**
     * 指定インデックスのポイントを削除
     */
    removePoint(index) {
        this.points.splice(index, 1);
        this.clearInputBoxes();
        this.drawImage();
        this.updatePointCount();
    }

    /**
     * 末尾に連続して存在する未入力（idが空）のユーザーポイントを削除
     * - JSONからのマーカー（isMarker=true）は対象外
     * - 一括削除後に1回だけ再描画・カウント更新
     */
    removeTrailingEmptyUserPoints() {
        if (this.points.length === 0) return;
        let removed = false;
        for (let i = this.points.length - 1; i >= 0; i--) {
            const point = this.points[i];
            if (point.isMarker) {
                // マーカーはスキップしてさらに前方を確認
                continue;
            }
            if ((point.id ?? '') === '') {
                this.points.splice(i, 1);
                removed = true;
                // さらに前にも未入力が続く場合に備えて継続
            } else {
                // 直近で未入力が終わったらそこで停止
                break;
            }
        }
        if (removed) {
            this.clearInputBoxes();
            this.drawImage();
            this.updatePointCount();
        }
    }
    
    /**
     * ルート中間点数表示を更新
     */
    updateWaypointCount() {
        document.getElementById('waypointCount').textContent = this.routePoints.length;
    }
    
    /**
     * ルート情報を全てクリア
     */
    clearRoute() {
        // ルートポイント配列をクリア
        this.routePoints = [];
        this.updateWaypointCount();
        
        // 開始・終了ポイントIDをクリア
        this.startPointId = '';
        this.endPointId = '';
        document.getElementById('startPointInput').value = '';
        document.getElementById('endPointInput').value = '';
        
        // 画面を再描画
        this.drawImage();
    }
    
    /**
     * ルートデータをJSON形式で出力・ダウンロード
     */
    exportRouteJSON() {
        // ルートポイントが選択されているかチェック
        if (this.routePoints.length === 0) {
            alert('ルートポイントが選択されていません');
            return;
        }
        
        // 座標変換用のスケール計算
        const scaleX = this.currentImage.width / this.canvas.width;
        const scaleY = this.currentImage.height / this.canvas.height;
        
        // 出力前の状態をデバッグ出力（削除）
        
        // ルートJSONデータ構造を作成
        const routeData = {
            routeInfo: {
                startPoint: this.startPointId || '',
                endPoint: this.endPointId || '',
                waypointCount: this.routePoints.length
            },
            imageInfo: {
                width: this.currentImage.width,
                height: this.currentImage.height
            },
            points: this.routePoints.map((point, index) => ({
                type: 'waypoint',
                index: index + 1,
                x: Math.round(point.x * scaleX),
                y: Math.round(point.y * scaleY)
            })),
            exportedAt: new Date().toISOString()
        };
        
        // 出力するJSONデータをコンソールに表示（削除）
        
        // ユーザーがファイルを指定してダウンロード
        this.downloadJSONWithUserChoice(routeData, 'route');
    }
    
    /**
     * ルート編集モードでの中間点追加
     */
    addRoutePoint(x, y) {
        // 新しいルートポイントを作成
        const point = { 
            x: Math.round(x), 
            y: Math.round(y)
        };
        
        // ルートポイント配列に追加し、青色で描画（半径3px、白枠1px）
        this.routePoints.push(point);
        this.drawPoint(point, '#0066ff', 3, 1);
        this.updateWaypointCount();
    }
    
    /**
     * ルートJSONファイルの読み込み処理
     */
    handleRouteJSONLoad(event) {
        // ファイル形式の検証
        const file = event.target.files[0];
        if (!file || !file.type.includes('json')) {
            alert('JSONファイルを選択してください');
            return;
        }
        
        // 画像読み込み確認
        if (!this.currentImage) {
            alert('先に画像を読み込んでください');
            return;
        }
        
        // JSONファイルを読み込み・パース
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
        
        // ファイル選択をクリア
        event.target.value = '';
    }
    
    /**
     * JSONデータからルート情報を復元
     */
    loadRouteFromJSON(data) {
        // 読み込まれたJSONデータ全体をコンソールに出力（削除）
        
        // データ形式の検証
        if (!data.points || !Array.isArray(data.points) || !data.routeInfo) {
            alert('ルートJSONファイルの形式が正しくありません');
            return;
        }
        
        // routeInfoの詳細確認（削除）
        
        // 座標変換用のスケール計算
        const scaleX = this.canvas.width / this.currentImage.width;
        const scaleY = this.canvas.height / this.currentImage.height;
        
        // 既存ルートデータをクリア
        this.routePoints = [];
        
        // 開始・終了ポイントIDを設定
        this.startPointId = data.routeInfo.startPoint || '';
        this.endPointId = data.routeInfo.endPoint || '';
        document.getElementById('startPointInput').value = this.startPointId;
        document.getElementById('endPointInput').value = this.endPointId;
        
        // 中間点データを復元（元画像座標からキャンバス座標に変換）
        data.points.forEach(pointData => {
            if (pointData.x !== undefined && pointData.y !== undefined && pointData.type === 'waypoint') {
                const point = {
                    x: Math.round(pointData.x * scaleX),
                    y: Math.round(pointData.y * scaleY)
                };
                this.routePoints.push(point);
            }
        });
        
        // UI更新
        this.updateWaypointCount();
        this.drawImage();
        
        // フォーカスをクリア
        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }
    }
    
    /**
     * JSONデータをファイルとしてダウンロード
     */
    downloadJSON(data, filename) {
        // JSON文字列に変換してBlobオブジェクトを作成
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // ダウンロードリンクを作成・実行
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // 一時要素とオブジェクトURLをクリーンアップ
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * ユーザーがファイルを指定してJSONデータをダウンロード
     */
    downloadJSONWithUserChoice(data, type) {
        // JSON文字列に変換してBlobオブジェクトを作成
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // デフォルトファイル名を生成
        const defaultFilename = this.currentImageFileName ? 
            `${this.currentImageFileName}_${type}.json` : 
            `${type}_${new Date().toISOString().slice(0, 10)}.json`;
        
        // ダウンロードリンクを作成・実行
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFilename;
        document.body.appendChild(a);
        a.click();
        
        // 一時要素とオブジェクトURLをクリーンアップ
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * レイアウト管理と画面リサイズ対応の初期化
     */
    initializeLayoutManager() {
        // 初期状態の表示を設定
        this.updateLayoutDisplay();
        this.updateEditingModeDisplay();
        
        // ウィンドウリサイズ時のキャンバス再調整
        window.addEventListener('resize', () => {
            if (this.currentImage) {
                setTimeout(() => {
                    this.setupCanvas();
                    this.drawImage();
                }, 100);
            }
        });
    }
    
    /**
     * 編集モードを変更
     */
    setEditingMode(mode) {
        this.currentEditingMode = mode;
        this.updateEditingModeDisplay();
    }
    
    /**
     * 編集モードに応じてUIパネルの表示・非表示を切り替え
     */
    updateEditingModeDisplay() {
        const pointEditor = document.getElementById('pointEditor');
        const routeEditor = document.getElementById('routeEditor');
        
        // 編集モードに応じてパネル表示を切り替え
        if (this.currentEditingMode === 'point') {
            pointEditor.style.display = 'flex';
            routeEditor.style.display = 'none';
        } else {
            pointEditor.style.display = 'none';
            routeEditor.style.display = 'block';
        }
        
        // ラジオボタンの選択状態を同期
        const radio = document.querySelector(`input[name="editingMode"][value="${this.currentEditingMode}"]`);
        if (radio) {
            radio.checked = true;
        }
    }
    
    /**
     * レイアウトを変更（サイドバー/オーバーレイ）
     */
    setLayout(layout) {
        this.currentLayout = layout;
        this.updateLayoutDisplay();
        
        // レイアウト変更時にキャンバスサイズを再調整
        if (this.currentImage) {
            setTimeout(() => {
                this.setupCanvas();
                this.drawImage();
            }, 300);
        }
    }
    
    /**
     * レイアウト変更に応じてCSS data属性とラジオボタンを更新
     */
    updateLayoutDisplay() {
        // メインコンテンツにレイアウト属性を設定
        const mainContent = document.querySelector('.main-content');
        mainContent.setAttribute('data-layout', this.currentLayout);
        
        // ラジオボタンの選択状態を同期
        const radio = document.querySelector(`input[name="layout"][value="${this.currentLayout}"]`);
        if (radio) {
            radio.checked = true;
        }
    }
    
    /**
     * 読み込まれた画像サイズに応じてキャンバスサイズを設定
     */
    setupCanvas() {
        if (!this.currentImage) return;
        
        // コンテナサイズを取得
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // レイアウトモードに応じて利用可能サイズを計算
        let availableWidth, availableHeight;
        
        if (this.currentLayout === 'sidebar') {
            availableWidth = containerRect.width - 40;
            availableHeight = window.innerHeight - 140;
        } else {
            availableWidth = window.innerWidth - 40;
            availableHeight = window.innerHeight - 140;
        }
        
        // 画像のアスペクト比を維持したキャンバスサイズを計算
        const imageAspectRatio = this.currentImage.height / this.currentImage.width;
        
        let canvasWidth = availableWidth;
        let canvasHeight = canvasWidth * imageAspectRatio;
        
        // 高さが制限を超える場合は高さ基準でサイズ調整
        if (canvasHeight > availableHeight) {
            canvasHeight = availableHeight;
            canvasWidth = canvasHeight / imageAspectRatio;
        }
        
        // キャンバスの実サイズとCSSサイズを設定
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        this.canvas.style.width = canvasWidth + 'px';
        this.canvas.style.height = canvasHeight + 'px';
        this.canvas.style.display = 'block';
        this.canvas.style.visibility = 'visible';
    }
}

// DOM読み込み完了後にアプリケーションを初期化
document.addEventListener('DOMContentLoaded', () => {
    new PickPoints();
});