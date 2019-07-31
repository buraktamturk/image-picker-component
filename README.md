# Form Picker Component

A work in progress HTML File / Image picker with customizable upload backend. Currently, only image picker is implemented.

## Usage

#### Register Component

```javascript
  require('image-picker-component').register("image-picker", (require('upload-controller-factory'))({
    xhrUrl: 'http://localhost/upload.php?filename=$file', // you can use $file to put file name to the URL, or omit it altogether if you use FormData
    xhrAsFormData: true, // if true, it sends the file as multipart data. Otherwise the whole file is sent as a body with content-type header as file type
    xhrFormDataFileKey: 'file', // if xhrAsFormData true, 

    xhrMethod: 'POST', // default
    xhrHeaders: {}, // extra headers to be sent
    xhrCallback: function(xhr) { }, // XHR hook before sending data
    upload: function(name, blob, contentType, abort, progress) {
      // Disables XHR and enables custom uploading backend.
      // Function must return a promise that will resolve with a javascript object.
      // when the user aborts the uploading, the AbortSignal is fired.
      // upload progress can be reported back to library by calling progress function which accepts numbers from 0 to 1 (i.e. progress(50 / 100) means half of the upload is completed).
    },

    // dealing with response (or the object returned from upload function)
    valueKey: 'id', // this field is submitted with the form (if the component has put inside a HTML form)
    srcKey: 'access_url', // a full path where this file can be located
    fields: ['id', 'access_url', 'name', 'size'], // save additional data from response, so they can be accessed from JavaScript with UploadController inside
  }));
```

### Crop Mode

User will be asked to crop the image no matter what. (Respecting Aspect Ratio)

```html
  <image-picker name="image_id" width="400" height="300" mode="crop"></image-picker>
```

### Auto Mode

User will be asked to crop the image only if the aspect ratio does not match.

```html
  <image-picker name="image_id" width="1920" height="1080" mode="auto"></image-picker>
```

### Keep Mode

The file will be uploaded as it is. (Ignoring Aspect Ratio)

```html
  <image-picker name="image_id" width="1920" height="1080" mode="keep"></image-picker>
```

### Reformat Mode

The image will be uploaded as jpeg format without any other modification.

```html
  <image-picker width="1920" height="1080" mode="reformat" format="image/jpeg"></image-picker>
```

**Note:** Format attribute can be specified on all modes, except keep mode. You can specify "image/png" to upload it as PNG file.

### Resize Mode

The image will be resized automatically for best-fit, respecting the aspect ratio of selected file (not the specified dimensions).

```html
  <image-picker width="1920" height="1080" mode="resize"></image-picker>
```

## Notes

Adding value and src attribute will automatically make this input pre-picked.

```html
  <image-picker name="image_id" width="1920" height="1080" value="11" src="https://www.gstatic.com/webp/gallery/2.jpg"></image-picker>
```

### Submitting Form

"valueKey" returned from the upload backend will be submitted in the form with "name" attribute on the element.