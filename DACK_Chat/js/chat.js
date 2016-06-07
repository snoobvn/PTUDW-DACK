angular.module('app', ['ui.router'])
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('');
    $stateProvider
        .state('index', {
            url: '',
            templateUrl: 'template/index.html',
            controller: 'myCtrl'
        })
        .state('room', {
            url: '/room',
            templateUrl: 'template/room.html',
            controller: 'myCtrl'
        })
        .state('roomchat', {
            url: '/roomchat/:id',
            templateUrl: 'template/chat.html',
            controller: ''
        })
        .state('contact', {
            url: '/contact',
            templateUrl: 'template/contact.html',
            controller: ''
        })
        .state('chat', {
            url: '/chat',
            templateUrl: 'template/chat.html',
            controller: ''
        })
        .state('user', {
            url: '/user',
            templateUrl: 'template/user.html',
            controller: ''
        });
}])
    .controller('MainCtrl', ['$scope', 'chatService', function($scope, chatService) {}])
    .directive('chat', ['$interval','$stateParams', 'chatService', function($interval,$stateParams, chatService) {
        return {
            restrict: 'E',
            scope: {
                api: '=',
            },
            templateUrl: 'template/chatDirective.html',
            link: function(scope, element, attrs) {
                console.log("Linked");
                var room = $stateParams.id;
                serviceEvent = chatService.scope;
                window.AudioContext = window.AudioContext || window.webkitAudioContext;

                var isSending = false;
                scope.name = scope.message = "";
                scope.sound = false;
                scope.videosID = [];
                var ontype = false;
                var colors = [];
                if (localStorage.getItem('hashID') === null) {
                    localStorage.setItem('hashID', randomhash());
                }
                $interval(function() {
                    if (ontype) return;
                    if (localStorage.getItem('name') != scope.name) {
                        if (localStorage.getItem('name') !== null)
                            scope.name = localStorage.getItem('name');
                    }
                }, 1000);
                scope.onSound = function() {
                    scope.sound = true;
                };
                scope.offSound = function() {
                    scope.sound = false;
                };
                scope.setName = function() {
                    ontype = true;
                    localStorage.setItem('name', scope.name);
                };
                scope.completeName = function() {
                    ontype = false;
                };
                scope.startName = function() {
                    ontype = true;
                };
                scope.numberGuest = -1;
                if (localStorage.getItem('name') === null)
                    scope.name = "#Guest";
                scope.numberConnection = -1;
                scope.$watch('numberConnection', function(a, b) {
                    if (a != b) {
                        scope.numberConnection = a;
                    }
                });
                //var conn = io('http://localhost:8080');
                //var conn = new WebSocket('wss://huynhquang.xyz/wss2/NNN');
                //var conn = new WebSocket('ws://localhost:8080');
                serviceEvent.$on('numberGuestChange', function(e, data) {
                    scope.numberGuest = data.n;
                    scope.$digest();
                    if (data.type == 'closed') {
                        addMessage("An user has left!");
                    } else if (data.type == 'join') {
                        addMessage("A user has joined!");
                    }
                });
                serviceEvent.$on('guestLeave', function(e, data) {
                    id = scope.videosID.indexOf(data.hashID);
                    scope.videosID.splice(id, 1);
                    scope.$digest();
                });
                serviceEvent.$on('numberConnection', function(e, data) {
                    scope.numberConnection = data;
                    scope.$digest();
                });
                serviceEvent.$on('messages', function(e, data) {
                    html = $(".chatbox ul", element);
                    html.text("");
                    messages = data.messages;
                    for(var roomID in messages){
                      if(roomID !== room) continue;
                      for(k in messages[roomID])
                      add(messages[roomID][k].name, messages[roomID][k].message, messages[roomID][k].time, messages[roomID][k].color, messages[roomID][k].image);
                    }
                    ended = true;
                });
                chatService.requestMessages();
                serviceEvent.$on('message', function(e, data) {
                    if(data.room != room) return;
                    if (ended && scope.sound) {
                        $("#notifysound", element)[0].volume = 0.5;
                        $("#notifysound", element)[0].play();
                    }
                    add(data.name, data.message, data.time, data.color, data.image);
                    scope.onSound();
                });
                oldSource = null;
                serviceEvent.$on('audioStream', function(e, data) {
                    if (oldSource !== null) stopAudio(oldSource);
                    oldSource = startAudio(audioCtx, data.data, data.time, data.length, data.sampleRate);
                });
                serviceEvent.$on('videoStream', function(e, data) {
                    hashID = data.hash;
                    ratio = data.ratio;
                    videoHeight = 200;
                    if (!scope.videosID.includes(data.hash)) {
                        scope.videosID.push(data.hash);
                    }
                    blob = new Blob([data.data], {
                        type: 'video/webm'
                    });
                    ratio = data.ratio;
                    capture = $("#video_" + hashID)[0];
                    var canvas = $('#canvas_' + hashID)[0];
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(capture, 0, 0, ratio * videoHeight, videoHeight);
                    capture.src = window.URL.createObjectURL(blob);
                    capture.play();
                    if (canvas.height != videoHeight) {
                        canvas.width = capture.width = videoHeight * ratio;
                        canvas.height = capture.height = videoHeight;
                    }
                    capture.addEventListener('play', function() {
                        var $this = this; //cache;
                    }, 0);
                });
                scope.enter = function($event) {
                    if ($event.keyCode == 13) {
                        scope.send();
                    }
                };
                scope.send = function() {
                    scope.offSound();
                    if (isSending) return;
                    var imageInput = $("#picture", element);
                    var fileNumber = imageInput[0].files.length;
                    if (scope.name === "" || (scope.message === "" && fileNumber === 0)) return;
                    var time = Date.now();
                    var name = escapeHtml(scope.name);
                    var image = "";
                    var completed = true;
                    isSending = true;
                    if (fileNumber >= 1) {
                        completed = false;
                        file = imageInput[0].files[0];
                        reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.addEventListener("load", function() {
                            image = reader.result;
                            completed = true;
                        }, false);
                    }
                    if (colors[name] === undefined) colors[name] = getRandomColor();
                    id = setInterval(function() {
                        if (completed) {
                            json = {
                                name: name,
                                room: room,
                                message: escapeHtml(scope.message),
                                time: time,
                                color: colors[name],
                                image: image
                            };
                            chatService.sendMessage(json);
                            //conn.send(JSON.stringify());
                            isSending = false;
                            scope.message = "";
                            imageInput.val(null);
                            clearInterval(id);
                        }
                    }, 50);

                };
                scrollToBottom = function() {
                    chatbox = $(".chatbox", element);
                    chatbox[0].scrollTop = chatbox[0].scrollHeight;
                };
                addMessage = function(message) {
                    var contents = `<li class=\"notify\">${message}</li>`;
                    html = $(".chatbox ul", element);
                    html.append(contents);
                    //html.html(html.html() + contents) ;
                    scrollToBottom();
                };
                add = function(name, message, time, color, image) {
                    _time = new Date();
                    _time.setTime(time);
                    timeString = _time.getHours() + ':' + _time.getMinutes();
                    var contents = `
                    <li>
                    <span class="time">${timeString}</span>  -
                    <span class="username" style="color:${color}">${name}</span>:
                    <span class="message">
                    ${message}
                    </span>
                    </li>
                    `;
                    html = $(".chatbox ul", element);
                    html.append(contents);
                    if (ytVidId(message) !== false) {
                        contents = `
                        <li>
                        <iframe class="thumbail" width="560" height="315" src="https://www.youtube.com/embed/${ytVidId(message)}" frameborder="0" allowfullscreen></iframe>
                        </li>
                        `;
                        html.append(contents);
                    } else {
                      //  console.log(message);
                    }
                    if (image !== "" && image !== undefined) {
                        contents = `<li><img class="thumbail" src="${image}"/></li>`;
                        html.append(contents);
                    }

                    scrollToBottom();
                };
                //Send camera here
                //Handle Camera
                console.log(camera);
                camera(scope, element, chatService);
                audioRecord(scope, chatService);
            }
        };
    }])
    .service('chatService', function($interval, $rootScope) {
        var scope = this.scope = $rootScope.$new(true);
        var conn = io(SOCKET_URL);
        this.user = "";
        this.rooms = {};
        //var conn = new WebSocket('wss://huynhquang.xyz/wss2/NNN');
        //var conn = new WebSocket('ws://localhost:8080');
        var ended = false;
        conn.on('connect', function(data) {
            console.log("Connection established!");
            conn.emit('hashID', localStorage.getItem('hashID'));
        });
        conn.on('numberGuest', function(data) {
            this.numberGuest = data;
            scope.$emit('numberGuestChange', {
                type: 'current',
                'n': this.numberGuest
            });
        });
        conn.on('numberConnection', function(data) {
            this.numberConnection = data;
            scope.$emit('numberConnection', data);
        });
        conn.on('closedClient', function(data) {
            this.numberGuest--;
            scope.$emit('numberGuestChange', {
                type: 'closed',
                'n': this.numberGuest
            });
            scope.$emit('guestLeave', {
                'hashID': data.hashID
            });
        });
        conn.on('newClient', function(data) {
            this.numberGuest++;
            scope.$emit('numberGuestChange', {
                type: 'join',
                'n': this.numberGuest
            });
        });
        conn.on('messages', function(data) {
            scope.$emit('messages', {
                messages: data
            });
        });
        conn.on('message', function(data) {
            scope.$emit('message', data);
        });
        conn.on('videoStream', function(data) {
            scope.$emit('videoStream', data);
        });
        conn.on('audioStream', function(data) {
            scope.$emit('audioStream', data);
        });
        this.sendMessage = function(json) {
            conn.emit("message", json);
        };
        this.sendVideoStream = function(json) {
            conn.emit("videoStream", json);
        };
        this.sendAudioStream = function(json) {
            conn.emit("audioStream", json);
        };
        this.login = function(data){
          this.user = data;
          conn.emit("login", data);
        }
        this.createRoom = function(data){
          conn.emit("createRoom", data);
        }
        this.requestMessages = function(){
          conn.emit("requestMessages");
        }
        this.getRoom = function(onResult){
          conn.emit("getRoom");
          conn.on('getRoom', function(data) {
              onResult(data);
          });
        }
    });

function audioRecord(scope, service) {
    var constraints = {
        audio: true
    };
    onStream = function(mediaStream){
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      var audioCtx = new AudioContext();
      var chunk = [];
      window.source = audioCtx.createMediaStreamSource(mediaStream);
      window.gain = audioCtx.createGain();
      gain.gain.value = 1;
      window.dest = audioCtx.createMediaStreamDestination();
      window.processor = audioCtx.createScriptProcessor(8192, 1, 1);
      var n = 10;
      var c = 0;
      var buffer = new Float32Array(8192 * n);
      processor.onaudioprocess = function(audioProcessingEvent) {
          // The input buffer is the song we loaded earlier
          var inputBuffer = audioProcessingEvent.inputBuffer;
          // The output buffer contains the samples that will be modified and played
          var outputBuffer = audioProcessingEvent.outputBuffer;
          // Loop through the output channels (in this case there is only one)
          var inputData = inputBuffer.getChannelData(0);
          var outputData = outputBuffer.getChannelData(0);
          // Loop through the 8192 samples
          for (var sample = 0; sample < inputBuffer.length; sample++) {
              // make output equal to the same as the input
              buffer[c * 8192 + sample] = inputData[sample];
              // Math.random() is in [0; 1.0]
              // audio needs to be in [-1.0; 1.0]
          }
          c++;
          if (c == n) {
              var hash = localStorage.getItem('hashID');
              json = {
                  'hash': hash,
                  'length': 8192 * n,
                  'data': buffer.buffer,
                  'time': audioCtx.currentTime,
                  'sampleRate': inputBuffer.sampleRate
              };
              c = 0;
              service.sendAudioStream(json);
          }

          //var bufferNode = audioCtx.createBufferSource();
          //window.source.connect(audioCtx.destination);

          // start the source playing
          //bufferNode.start();
      };
      source.connect(gain);
      gain.connect(processor);
      processor.connect(dest);
    };
    onError = function(err){
      console.log(err.name);
    };
    if(NEW_API){
      navigator.mediaDevices.getUserMedia(constraints)
          .then(onStream)
          .catch(onError);
    }else{
      navigator.getUserMedia(constraints, onStream, onError);
    }

}

function camera(scope, element, service) {
    cameraElem = $("#mycamera", element).get(0);
    cameraElem.volume = 0;
    var options = {
        videoBitsPerSecond: 200000,
        mimeType: 'video/webm',
    };
    var constraints = {
        video: {
            mandatory: {
                maxWidth: 200,
                maxHeight: 200
            }
        }
    };
    onStream = function(mediaStream) {
        scope.hasCamera = true;
        chunk = [];
        var mediaRecorder = new MediaRecorder(mediaStream, options);
        mediaRecorder.start();
        mediaRecorder.ondataavailable = function(e) {
            chunk.push(e.data);
        };
        var record = function() {
            var blob = new Blob(chunk, {
                type: 'video/webm'
            });
            //send blob overwork
            var hash = localStorage.getItem('hashID');
            //blob to json
            var reader = new FileReader();
            reader.onloadend = function() {
                arrayBuffer = this.result;
                json = {
                    hash: hash,
                    data: arrayBuffer,
                    ratio: camera.videoWidth / camera.videoHeight
                };
                service.sendVideoStream(json);
            };
            reader.readAsArrayBuffer(blob);
            mediaRecorder.stop();
            chunk = [];
            mediaRecorder.start();
        };
        setInterval(function() {
            record();
        }, 500);
        cameraElem.src = window.URL.createObjectURL(mediaStream);
        cameraElem.onloadedmetadata = function(e) {
            cameraElem.play();
        };
    };
    onError = function(err) {
        scope.hasCamera = false;
        console.log("Camera Error" + err.name);
    };
    if (NEW_API) {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(onStream)
            .catch(onError);
    } else {
      navigator.getUserMedia(constraints, onStream, onError);
    }
}
