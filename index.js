(function(root, factory) {
  if(typeof define === 'function' && define.amd) {
    define(['modal-cropper', 'file-dialog'], factory);
  } else if(typeof exports === 'object') {
    module.exports = factory(require('modal-cropper'), require('file-dialog'));
  } else {
    root.ImagePickerComponent = factory(root.modal_cropper, root.fileDialog);
  }
})(this, function(cropper, fileDialog) {
  var css = `
  .crop-root {
    display: block;
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    "Oxygen", "Ubuntu", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji",
    "Segoe UI Emoji", "Segoe UI Symbol"
  }

  .crop-root > .area-root {
    background: #625D5D;
    position: relative;
    text-align: center;
    font-size: 13pt;
  }

  .crop-root > .area-root > .area {
    display:block;
    position: absolute;
    left:0;
    top:0;
    right:0;
    bottom:0;
  }

  .info {
    display: table;
    color:white;
    text-decoration: none;
    width: 100%;
    height: 100%;
    line-height: 40pt;
  }

  .info-text {
    display:table-cell;
    vertical-align: middle;
  }

  .area:not(:hover) > div.btn-root {
    display: none;
  }

  .area img, .area > div.btn-root {
    display: block;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    width:100%;
    height:100%;
  }

  .area img {
    object-fit: contain;
  }

  .area > div.btn-root {
    background-color: rgba(0,0,0,.2);
  }

  .btn-root > div {
    position:absolute;
    bottom:0;
    left:0;
    width:100%;
  }

  a.btn {
    display: block;
    margin: 10px auto;
    width: 16px;
    height: 16px;
    padding: 8px;
    border-radius: 50%;
  }

  a.upload-btn {
    background-color: #59E817;
    color: #FFF;
  }

  a.cancel-btn {
    background-color: #E56717;
    color: #FFF;
    display: block;
  }

  a.cancel-btn svg {
    height: 14px;
    width: 16px;
  }

  a.pending-btn {
    color: #FFF;
    background-color: #F62817;
  }

  a.pending-btn svg {

  }

  a svg {
    width: 16px;
    height: 16px;
    margin: 0 auto;
  }

  div.progress {
    height:3px;
    width:100%;
  }

  div.progress > div {
    height:3px;
    background-color:#52D017;
  }
  `;

  var types = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/tiff': 'tiff',
    'image/webp': 'webp'
  };

  function change_ext(filename, ext) {
    var dotted = filename.split('.');
    if(dotted.length) {
      dotted[dotted.length - 1] = ext;
      return dotted.join('.');
    }

    return filename + '.' + ext;
  }

  function blob_to_canvas(blob) {
    return new Promise(function(resolve) {
      var canvas = document.createElement('canvas');

      var img = new Image();
      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(img,0,0);
        resolve(canvas);
      };
  
      img.src = URL.createObjectURL(blob);
    });
  }

  function resize_canvas(canvas, width, height) {
    var ratio = canvas.width / canvas.height;

    var w = width;
    var h = Math.floor(w / ratio);
    
    if (h > height) {
        h = height;
        w = Math.floor(height * ratio);
    }
    
    var elem = document.createElement('canvas');
    elem.width = w;
    elem.height = h;

    var ctx = elem.getContext('2d');
    ctx.drawImage(canvas, 0, 0, w, h);

    return elem;
  }

  return {
    register: function(name, MakeUploadController) {
      class ImagePickerElement extends HTMLElement {
        constructor() {
          super();

          this._shadowRoot = this.attachShadow({ 'mode': 'open' });

          var style = document.createElement('style');
          this._shadowRoot.appendChild(style);

          style.type = 'text/css';
          style.appendChild(document.createTextNode(css));

          var rcrop = document.createElement('div');
          rcrop.className = 'crop-root';

          this.areaRoot = document.createElement('div');
          this.areaRoot.className = "area-root";

          this.area = document.createElement('div');
          this.area.className = 'area';
          this.areaRoot.appendChild(this.area);

          this.btnRoot = document.createElement('div');
          this.btnRoot.className = 'btn-root';

          this.btnDiv = document.createElement('div');
          this.btnDiv.className = 'btn-root';

          this.btnRoot.appendChild(this.btnDiv);
          this.area.appendChild(this.btnRoot);

          rcrop.appendChild(this.areaRoot);

          this.progressRootDiv = document.createElement('div');
          this.progressRootDiv.className = "progress";
          rcrop.appendChild(this.progressRootDiv);

          this._shadowRoot.appendChild(rcrop);

          this.listenerFnc = this.listener.bind(this);
        }

        connectedCallback() {
          if(this.hasAttribute('width') && this.hasAttribute('height')) {
            this.updateRatio();
          }

          if(!this.$controller) {
            var obj = {};

            obj[MakeUploadController.valueKey] = this.hasAttribute('value') && this.getAttribute('value').length && this.getAttribute('value');
            obj[MakeUploadController.srcKey] = this.hasAttribute('src') && this.getAttribute('src').length && this.getAttribute('src');

            this.$controller = MakeUploadController(obj);
            this.$controller.addListener(this.listenerFnc);
          }
        }

        setController(controller) {
          if(this.$controller) {
            this.$controller.removeListener(this.listenerFnc);
          }

          this.$controller = controller;

          if(this.$controller) {
            this.$controller.addListener(this.listenerFnc);
          }
        }

        listener() {
          if(this.$controller.$state == 1) {
            if(this.hiddenInput) {
              this.hiddenInput.parentNode.removeChild(this.hiddenInput);
              this.hiddenInput = null;
            }

            this.showUploadBtn();
            this.showInfo();
          } else if(this.$controller.$state == 2) {
            if(this.hiddenInput) {
              this._shadowRoot.removeChild(this.hiddenInput);
              this.hiddenInput = null;
            }

            this.showPendingBtn(this.$controller.$pr);
            this.showImage(this.$controller.$blob_url);
          } else if(this.$controller.$state == 3) {
            this.showCancelBtn();
            this.showImage(this.$controller.$blob_url || this.$controller[MakeUploadController.srcKey]);

            if(this.hasAttribute('name')) {
              if(!this.hiddenInput) {
                this.hiddenInput = document.createElement('input');
                this.hiddenInput.type = 'hidden';
                this.hiddenInput.name = this.getAttribute('name');
                this.parentNode.appendChild(this.hiddenInput);
              }

              this.hiddenInput.value = this.$controller[MakeUploadController.valueKey];
            }
          }
        }

        disconnectedCallback() {
          this.$controller.removeListener(this.listenerFnc);
        }

        updateRatio() {
          var width = Number(this.getAttribute('width')),
              height = Number(this.getAttribute('height'));

          if(this.$width != width && this.$height != height) {
            this.$width = width;
            this.$height = height;

            this.areaRoot.style.paddingBottom = (height / width * 100) + '%';

            this.infoText && (this.infoText.innerText = width + " x " + height);
          }
        }
        
        showCancelBtn() {
          if(this.progressDiv) {
            this.progressRootDiv.removeChild(this.progressDiv);
            this.progressDiv = null;
          }

          if(!this.cancelBtn) {  
            if(this.pendingBtn) {
              this.btnDiv.removeChild(this.pendingBtn);
              this.pendingBtn = null;
            }

            if(this.uploadBtn) {
              this.btnDiv.removeChild(this.uploadBtn);
              this.uploadBtn = null;
            }

            this.cancelBtn = document.createElement('a');
            this.cancelBtn.href = "#";
            this.cancelBtn.className = "btn cancel-btn";
            this.cancelBtn.innerHTML = '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="trash-alt" class="svg-inline--fa fa-trash-alt fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M32 464a48 48 0 0 0 48 48h288a48 48 0 0 0 48-48V128H32zm272-256a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zM432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"></path></svg>';
            
            var that = this;
            this.cancelBtn.onclick = function(e) {
              e.preventDefault();
              that.$controller.remove();
            };
            this.btnDiv.appendChild(this.cancelBtn);
          }

          return this.cancelBtn;
        }

        showPendingBtn(percent) {
          if(!this.progressDiv) {
            this.progressDiv = document.createElement('div');
            this.progressRootDiv.appendChild(this.progressDiv);
          }

          this.progressDiv.style.width = (percent * 100) + '%';

          if(!this.pendingBtn) {  
            if(this.cancelBtn) {
              this.btnDiv.removeChild(this.cancelBtn);
              this.cancelBtn = null;
            }

            if(this.uploadBtn) {
              this.btnDiv.removeChild(this.uploadBtn);
              this.uploadBtn = null;
            }

            this.pendingBtn = document.createElement('a');
            this.pendingBtn.href = "#";
            this.pendingBtn.className = "btn pending-btn";
            this.pendingBtn.innerHTML = '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="times" class="svg-inline--fa fa-times fa-w-11" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 512"><path fill="currentColor" d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>';
            
            var that = this;
            this.pendingBtn.onclick = function(e) {
              e.preventDefault();
              that.$controller.cancel();
            };
            this.btnDiv.appendChild(this.pendingBtn);
          }

          return this.pendingBtn;
        }

        showUploadBtn() {
          if(this.progressDiv) {
            this.progressRootDiv.removeChild(this.progressDiv);
            this.progressDiv = null;
          }

          if(!this.uploadBtn) {  
            if(this.cancelBtn) {
              this.btnDiv.removeChild(this.cancelBtn);
              this.cancelBtn = null;
            }

            if(this.pendingBtn) {
              this.btnDiv.removeChild(this.pendingBtn);
              this.pendingBtn = null;
            }

            this.uploadBtn = document.createElement('a');
            this.uploadBtn.href = "#";
            this.uploadBtn.className = "btn upload-btn";
            this.uploadBtn.innerHTML = '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="upload" class="svg-inline--fa fa-upload fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M296 384h-80c-13.3 0-24-10.7-24-24V192h-87.7c-17.8 0-26.7-21.5-14.1-34.1L242.3 5.7c7.5-7.5 19.8-7.5 27.3 0l152.2 152.2c12.6 12.6 3.7 34.1-14.1 34.1H320v168c0 13.3-10.7 24-24 24zm216-8v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h136v8c0 30.9 25.1 56 56 56h80c30.9 0 56-25.1 56-56v-8h136c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z"></path></svg>';
            
            var that = this;
            this.uploadBtn.onclick = function(e) {
              e.preventDefault();

              fileDialog({
                accept: 'image/*'
              })
              .then(function(data) {
                var file = data[0];

                if(file) {
                  var format_mime = that.hasAttribute('format') ? that.getAttribute('format') : file.type;
                  var format_ext = types[format_mime];

                  switch(that.getAttribute("mode")) {
                    case "resize":
                      blob_to_canvas(file)
                        .then(canvas => {
                          resize_canvas(canvas, that.$width, that.$height)
                            .toBlob(function(blob) {
                              that.$controller.upload(change_ext(file.name, types[blob.type]), blob.type, blob);
                            }, format_mime, 1);
                        });
                    break;
                    case "reformat":
                      if(file.type === format_mime) {
                        that.$controller.upload(file.name, file.type, file);
                      } else {
                        blob_to_canvas(file)
                          .then(canvas => {
                            canvas
                              .toBlob(function(blob) {
                                that.$controller.upload(change_ext(file.name, types[blob.type]), blob.type, blob);
                              }, format_mime, 1);
                          });
                      }
                    break;
                    case "keep":
                      that.$controller.upload(file.name, file.type, file);
                    break;
                    case "auto":
                      blob_to_canvas(file)
                        .then(canvas => {
                          if((canvas.width / canvas.height) === (that.$width / that.$height)) {
                            return new Promise(function(resolve) {
                              resize_canvas(canvas, that.$width, that.$height)
                                .toBlob(resolve, format_mime, 1);
                            });
                          }

                          return cropper(file, that.$width, that.$height, format_ext);
                        })
                        .then(function(blob) {
                          that.$controller.upload(change_ext(file.name, types[blob.type]), blob.type, blob);
                        });
                    break;
                    case "crop":
                    default:
                      cropper(file, that.$width, that.$height, format_ext)
                        .then(function(blob) {
                          that.$controller.upload(change_ext(file.name, types[blob.type]), blob.type, blob);
                        });
                    break;
                  }
                }
              });
            };

            this.btnDiv.appendChild(this.uploadBtn);
          }

          return this.uploadBtn;
        }

        showInfo() {
          if(this.img) {
            this.area.removeChild(this.img);
            this.img = null;
          }

          if(!this.infoDiv) {
            this.infoDiv = document.createElement('div');
            this.infoDiv.className = 'info';

            this.infoText = document.createElement('div');
            this.infoText.className = 'info-text';

            this.infoText.innerText = this.$width + " x " + this.$height;
            this.infoDiv.appendChild(this.infoText);
            
            this.area.insertBefore(this.infoDiv, this.area.firstChild);
          }
        }

        showImage(src) {
          if(this.infoDiv) {
            this.area.removeChild(this.infoDiv);
            this.infoDiv = null;
          }

          if(this.img) {
            if(this.img.src !== src) {
              this.img.src = src;
            }
          } else {
            this.img = document.createElement('img');
            this.img.className = 'img';
            this.img.src = src;
            this.area.insertBefore(this.img, this.area.firstChild);
          }
        }

        static get observedAttributes() {
          return ['width', 'height', 'value', 'src', 'name'];
        }
    
        attributeChangedCallback(name, oldValue, newValue) {
          switch(name) {
            case "width":
            case "height":
              this.updateRatio();
            break;
            case "value":
            case "src":
      //        this.updateData();
            break;
            case "name":
              if(this.hiddenInput) {
                this.hiddenInput.name = newValue;
              }
            break;
          }
        }
      }

      window.customElements.define(name, ImagePickerElement);

      return ImagePickerElement;
    }
  };
});