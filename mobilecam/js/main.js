/*

>> kasperkamperman.com - 2018-04-18
>> https://www.kasperkamperman.com/blog/camera-template/

*/

// let now = new Date()
        // let parentKey = now.toDateString() + now.toTimeString()
        // let photoKey = parentKey + guid()

        // s3.headObject({Key:parentKey}, function (err,data) {
        //     if(!err){

        //     }
        //     if (err.code !== 'NotFound') {
        //         return alert('There was an error creating your album: ' + err.message);
        //     }
        //     s3.putObject({Key: parentKey}, function(err, data) {
        //         if (err) {
        //           return alert('There was an error creating your album: ' + err.message);
        //         }
        //         alert('Successfully created a new album.');
            
        // })

// var albumBucketName = 'test-camera-app';
// var bucketRegion = 'us-east-1';
// var IdentityPoolId = 'us-east-1:dd7eed13-39e5-4e67-ad47-ab7a04630936';

// AWS.config.update({
//   region: bucketRegion,
//   credentials: new AWS.CognitoIdentityCredentials({
//     IdentityPoolId: IdentityPoolId
//   })
// });



// var s3 = new AWS.S3({
//   apiVersion: '2006-03-01',
//   params: {Bucket: albumBucketName}
// });

// function guid() {
//     function s4() {
//       return Math.floor((1 + Math.random()) * 0x10000)
//         .toString(16)
//         .substring(1);
//     }
//     return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
//       s4() + '-' + s4() + s4() + s4();
//   }
var takeSnapshotUI = createClickFeedbackUI();

var video;
var takePhotoButton;
var toggleFullScreenButton;
var switchCameraButton;
var amountOfCameras = 0;
var currentFacingMode = 'environment';

document.addEventListener("DOMContentLoaded", function(event) {

    // do some WebRTC checks before creating the interface
    DetectRTC.load(function() {

        // do some checks
        if (DetectRTC.isWebRTCSupported == false) {
            alert('Please use Chrome, Firefox, iOS 11, Android 5 or higher, Safari 11 or higher');
        }
        else {
            if (DetectRTC.hasWebcam == false) {
                alert('Please install an external webcam device.');
            }
            else {

                amountOfCameras = DetectRTC.videoInputDevices.length;
                       
                initCameraUI();
                initCameraStream();
            } 
        }
        
        console.log("RTC Debug info: " + 
            "\n OS:                   " + DetectRTC.osName + " " + DetectRTC.osVersion + 
            "\n browser:              " + DetectRTC.browser.fullVersion + " " + DetectRTC.browser.name +
            "\n is Mobile Device:     " + DetectRTC.isMobileDevice +
            "\n has webcam:           " + DetectRTC.hasWebcam + 
            "\n has permission:       " + DetectRTC.isWebsiteHasWebcamPermission +       
            "\n getUserMedia Support: " + DetectRTC.isGetUserMediaSupported + 
            "\n isWebRTC Supported:   " + DetectRTC.isWebRTCSupported + 
            "\n WebAudio Supported:   " + DetectRTC.isAudioContextSupported +
            "\n is Mobile Device:     " + DetectRTC.isMobileDevice
        );

    });

});

function initCameraUI() {
    
    video = document.getElementById('video');

    takePhotoButton = document.getElementById('takePhotoButton');
    toggleFullScreenButton = document.getElementById('toggleFullScreenButton');
    switchCameraButton = document.getElementById('switchCameraButton');
    
    // https://developer.mozilla.org/nl/docs/Web/HTML/Element/button
    // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques/Using_the_button_role

    takePhotoButton.addEventListener("click", function() {
        takeSnapshotUI();
        takeSnapshot();        
    });

    // -- fullscreen part

    function fullScreenChange() {
        if(screenfull.isFullscreen) {
            toggleFullScreenButton.setAttribute("aria-pressed", true);
        }
        else {
            toggleFullScreenButton.setAttribute("aria-pressed", false);
        }
    }

    if (screenfull.enabled) {
        screenfull.on('change', fullScreenChange);

        toggleFullScreenButton.style.display = 'block';  

        // set init values
        fullScreenChange();

        toggleFullScreenButton.addEventListener("click", function() {
            screenfull.toggle(document.getElementById('container'));
        });
    }
    else {
        console.log("iOS doesn't support fullscreen (yet)");   
    }
        
    // -- switch camera part
    if(amountOfCameras > 1) {
        
        switchCameraButton.style.display = 'block';
        
        switchCameraButton.addEventListener("click", function() {

            if(currentFacingMode === 'environment') currentFacingMode = 'user';
            else                                    currentFacingMode = 'environment';

            initCameraStream();

        });  
    }

    // Listen for orientation changes to make sure buttons stay at the side of the 
    // physical (and virtual) buttons (opposite of camera) most of the layout change is done by CSS media queries
    // https://www.sitepoint.com/introducing-screen-orientation-api/
    // https://developer.mozilla.org/en-US/docs/Web/API/Screen/orientation
    window.addEventListener("orientationchange", function() {
        
        // iOS doesn't have screen.orientation, so fallback to window.orientation.
        // screen.orientation will 
        if(screen.orientation) angle = screen.orientation.angle;
        else                   angle = window.orientation;

        var guiControls = document.getElementById("gui_controls").classList;
        var vidContainer = document.getElementById("vid_container").classList;

        if(angle == 270 || angle == -90) {
            guiControls.add('left');
            vidContainer.add('left');
        }
        else {
            if ( guiControls.contains('left') ) guiControls.remove('left');
            if ( vidContainer.contains('left') ) vidContainer.remove('left');
        }

        //0   portrait-primary   
        //180 portrait-secondary device is down under
        //90  landscape-primary  buttons at the right
        //270 landscape-secondary buttons at the left
    }, false);
    
}

// https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
function initCameraStream() {

    // stop any active streams in the window
    if (window.stream) {
        window.stream.getTracks().forEach(function(track) {
            track.stop();
        });
    }

    var constraints = { 
        audio: false, 
        video: {
            //width: { min: 1024, ideal: window.innerWidth, max: 1920 },
            //height: { min: 776, ideal: window.innerHeight, max: 1080 },
            facingMode: currentFacingMode
        }
    };

    navigator.mediaDevices.getUserMedia(constraints).
    then(handleSuccess).catch(handleError);   

    function handleSuccess(stream) {

        window.stream = stream; // make stream available to browser console
        video.srcObject = stream;

        if(constraints.video.facingMode) {

            if(constraints.video.facingMode === 'environment') {
                switchCameraButton.setAttribute("aria-pressed", true);
            }
            else {
                switchCameraButton.setAttribute("aria-pressed", false);
            }
        }

        return navigator.mediaDevices.enumerateDevices();
    }

    function handleError(error) {

        console.log(error);

        //https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
        if(error === 'PermissionDeniedError') {
            alert("Permission denied. Please refresh and give permission.");
        }
        
    }

}

function takeSnapshot() {
    
    // if you'd like to show the canvas add it to the DOM
    var canvas = document.createElement('canvas');

    var width = video.videoWidth;
    var height = video.videoHeight;

    canvas.width = 530;
    canvas.height = 530;

    context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, 530, 530);

    // polyfil if needed https://github.com/blueimp/JavaScript-Canvas-to-Blob
    
    // https://developers.google.com/web/fundamentals/primers/promises
    // https://stackoverflow.com/questions/42458849/access-blob-value-outside-of-canvas-toblob-async-function
    function getCanvasBlob(canvas) {
        return new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) { resolve(blob) }, 'image/jpeg');
        })
    }

    // some API's (like Azure Custom Vision) need a blob with image data
    getCanvasBlob(canvas)
    .then(function(blob) {
    //     console.log(URL.createObjectURL(blob))
    //     // do something with the image blob
    //     let reader = new FileReader();
    //     reader.readAsDataURL(blob); 
        
    //     function readerComplete(reader) {
    //         return new Promise(function(resolve,reject){
    //             reader.onloadend = resolve
    //         })
    //     }
        
    //     return readerComplete(reader)
    // })
    // .then( function (progressEvent) {
    //     console.log(progressEvent.currentTarget.result)
    //     return progressEvent.currentTarget.result                
    // })
    // .then(function (base64) {
        
        let formData = new FormData()
        formData.append("media",blob,'blob.jpeg')

        let options = {
            method:"POST",
            body: formData,
            
        }

        // delete options.headers["Content-Type"]
        
        return fetch(`https://api-2445582032290.production.gw.apicast.io/v1/foodrecognition/full?user_key=ab4dc23f37455ad57e36eee48e77e644`,{
            method: "POST",
            // headers: {
            //     "Content-Type": "multipart/form-data",
            // },
            body: formData
            

        })
        
    })
    .then(function(response) {
        return response.json()
    })
    .then(function(data) {
        console.log(data)
    })
    .catch(function(err) {
        console.log(err)
    });

}

// https://hackernoon.com/how-to-use-javascript-closures-with-confidence-85cd1f841a6b
// closure; store this in a variable and call the variable as function
// eg. var takeSnapshotUI = createClickFeedbackUI();
// takeSnapshotUI();

function createClickFeedbackUI() {

    // in order to give feedback that we actually pressed a button. 
    // we trigger a almost black overlay
    var overlay = document.getElementById("video_overlay");//.style.display;

    // sound feedback
    var sndClick = new Howl({ src: ['snd/click.mp3'] });

    var overlayVisibility = false;
    var timeOut = 80;

    function setFalseAgain() {
        overlayVisibility = false;	
        overlay.style.display = 'none';
    }

    return function() {

        if(overlayVisibility == false) {
            sndClick.play();
            overlayVisibility = true;
            overlay.style.display = 'block';
            setTimeout(setFalseAgain, timeOut);
        }   

    }
}