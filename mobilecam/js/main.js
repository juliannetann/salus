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
var bucketRegion = 'us-east-1';
var IdentityPoolId = 'us-east-1:0058b554-df7c-4fad-b48d-8af43ffd03bd';

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});


var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

// dynamodb.batchGetItem(params, function (err, data) {
//   if (err) console.log(err, err.stack); // an error occurred
//   else     console.log(data);           // successful response
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
var img;
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
    function calculateProportionalAspectRatio(srcWidth, srcHeight, maxWidth, maxHeight) {
        return(Math.min(maxWidth / srcWidth, maxHeight / srcHeight));
    }

    // if you'd like to show the canvas add it to the DOM
    var canvas = document.createElement('canvas');
    var scaledCanvas = document.createElement('canvas')

    img = document.getElementById("img_overlay")
    
    var width = video.videoWidth;
    var height = video.videoHeight;

    var videoScreenWidth = video.offsetWidth
    var videoScreenHeight = video.offsetHeight
    // console.log(video.offsetWidth,video.offsetHeight)
    canvas.width = videoScreenWidth;
    canvas.height = videoScreenHeight;
    
    // console.log(width,height)
    scaledCanvas.width = 544
    scaledCanvas.height = 544    

    
    scaledContext = scaledCanvas.getContext("2d");
    
    context = canvas.getContext('2d');
    // var ratio=calculateProportionalAspectRatio(video.width,video.height,canvas.width,canvas.height)
    // console.log(video.width,video.height,canvas.width,canvas.height);

    



    // context.drawImage(video,0,0,video.width*ratio,video.height*ratio);

    context.drawImage(video,0,0,canvas.width,canvas.height);

    scaledContext.drawImage(video,0,0)
    // previewContext.drawImage(video, 0, 0, 530, 530);
    
    // previewContext.drawImage(video,0,0,width,height)
    

    img.src = canvas.toDataURL("image/jpeg")
    video.style.display = "none"

    
    
 
    // polyfil if needed https://github.com/blueimp/JavaScript-Canvas-to-Blob
    
    // https://developers.google.com/web/fundamentals/primers/promises
    // https://stackoverflow.com/questions/42458849/access-blob-value-outside-of-canvas-toblob-async-function
    




    function getCanvasBlob(canvas) {
        
        return new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) { resolve(blob) }, 'image/jpeg');
        })
    }
    let container = document.getElementById("container")
    // some API's (like Azure Custom Vision) need a blob with image data
    getCanvasBlob(scaledCanvas)
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

        let sek
        sek = "ab4dc23f37455ad57e36eee48e77e644"
        let apiKey = 1 && sek
        stopCameraSteam()
        // window.location.href = "camera_2.html"
        container.classList.add("loading")
        return fetch(`https://api-2445582032290.production.gw.apicast.io/v1/foodrecognition/full?user_key=${apiKey}`,{
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
        
        let main = document.getElementById("main")
        // window.location.replace("./camera_2.html")
        container.style.display = "none"
        
        main.innerHTML = `
        <div id="box">
            <div id="title">PHOTO DETAILS</div>
            <div id="box2">
                <div class="section">
                    <div class="question" id="choice-section">
                        <div class="subheading">Please select which type of food it is:</div>
                        
                           
                        <select class="browser-default custom-select dropdown-select-salus" id="group_dropdown">
                            <option selected>Choose your group:</option>
                           
                        </select>
                        <select class="browser-default custom-select dropdown-select-salus" id="food_dropdown">
                            
                           
                        </select>
                        <select class="browser-default custom-select dropdown-select-salus" id="serving_dropdown">
                            
                           
                        </select>
                            
                    </div>
                    <div class="line"></div>
                    <div class="question">
                    <div class="subheading">Nutritional Information:</div>
                    <div class="text list-item" id="nutritional-breakdown">

                    </div>
                </div>
            </div>
            </div>
            <div style="display: flex; justify-content: center; padding: 20px">
                <button id="log">ADD TO FOOD LOG</button>
            </div>
      </div>
      `

        main.style.backgroundColor = "#347037"
        console.log(data)
        let groupDropDown = document.getElementById("group_dropdown")
        data.results.map( (group,ind) => {
            let option = document.createElement("option")
            option.setAttribute("value",group.group)
            option.innerText=group.group

            groupDropDown.appendChild(option)
        }
        )
        
        groupDropDown.addEventListener("change", function(event) {
            let foodDropDown = document.getElementById("food_dropdown")
            let servingDropDown = document.getElementById("serving_dropdown")
            let displayInfo = document.getElementById("nutritional-breakdown")
            displayInfo.innerHTML = ""
            servingDropDown.innerHTML = ""
            foodDropDown.innerHTML = ""
            
            let baseOption = document.createElement("option")
            baseOption.selected = true;
            baseOption.innerText="Choose your food:"
            
            foodDropDown.appendChild(baseOption)

            foodDropDown.style.display = "block"

            console.log(event)
            console.log(data.results)
            
            let chosenItem = data.results.filter( food => food.group===event.target.value)[0]
            
            chosenItem.items.map( (food,ind) => {
                let option = document.createElement("option")
                option.setAttribute("value",food.name)
                option.innerText=food.name
    
                foodDropDown.appendChild(option)
            } )

            foodDropDown.addEventListener("change", function(event) {
                displayInfo.innerHTML = ""
                servingDropDown.innerHTML = ""
                let baseOptionServing = document.createElement("option")
                baseOptionServing.selected = true
                baseOptionServing.innerText="Choose your serving size:"
                
                servingDropDown.appendChild(baseOptionServing)

                servingDropDown.style.display = "block"

                
                let chosenFood = chosenItem.items.filter( food => food.name===event.target.value)[0]
                let nutritionalContent = chosenFood.nutrition
                
                console.log(nutritionalContent)
                chosenFood.servingSizes.map( (serving,ind) => {
                    let option = document.createElement("option")
                    option.setAttribute("value",serving.unit)
                    option.innerText=serving.unit
        
                    servingDropDown.appendChild(option)
                } )

                servingDropDown.addEventListener("change", function (event) {
                    displayInfo.innerHTML = ""
                    let servingObj = chosenFood.servingSizes.filter( serving => serving.unit===event.target.value)[0]
                    let servingObjWeight = servingObj.servingWeight
                    let displayNutrition = {}
                    let keys = Object.keys(nutritionalContent)
                    console.log(servingObjWeight)
                    console.log(keys)
                    console.log(Object.values(nutritionalContent))
                    let vals = Object.values(nutritionalContent).map( info => {return servingObjWeight ? info*servingObjWeight*1000: info*1000})
                    console.log(vals)

                    Object.assign(displayNutrition,keys.reduce((obj,key,index) => {
                        if (key === "calories"){
                            let accurateVal = vals[index]/1000
                            accurateVal = parseFloat(accurateVal.toFixed(4))
                            return {...obj,[key]:accurateVal}
                        } else {
                            let accurateVal = vals[index]
                            accurateVal = parseFloat(accurateVal.toFixed(4))
                            accurateVal = accurateVal+"g"
                            return {...obj,[key]:accurateVal}
                        }
                        
                    }, {}))
                    console.log(displayNutrition)
                    
                    
                    Object.keys(displayNutrition).forEach( key => {
                        
                        let elem = document.createElement("div")
                        

                        elem.innerHTML = `<strong>${key}</strong>: ${displayNutrition[key]}`

                        displayInfo.appendChild(elem)

                    
                    })


                })
            })

        })
        
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


function stopCameraSteam() {
    if (window.stream) {
        window.stream.getTracks().forEach(function(track) {
            track.stop();
        });
    }

}