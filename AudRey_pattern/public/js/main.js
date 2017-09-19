      var prevFramePoints = [];
      var templateNumber = 15;
      for (var i = 0; i < templateNumber; i++) {
        prevFramePoints[i] = [0, 0];
      }

      // BoundingBoxTracker ======================================================
      var BoundingBoxTracker = function() {
        BoundingBoxTracker.base(this, 'constructor');
      };
      tracking.inherits(BoundingBoxTracker, tracking.Tracker);

      BoundingBoxTracker.prototype.templateDescriptors_ = null;
      BoundingBoxTracker.prototype.templateKeypoints_ = null;
      BoundingBoxTracker.prototype.fastThreshold = 40;
      BoundingBoxTracker.prototype.blur = 3;

      BoundingBoxTracker.prototype.setTemplate = function(pixels, width, height) {
        var blur = tracking.Image.blur(pixels, width, height, 3);
        var grayscale = tracking.Image.grayscale(blur, width, height);
        this.templateKeypoints_ = tracking.Fast.findCorners(grayscale, width, height);
        this.templateDescriptors_ = tracking.Brief.getDescriptors(grayscale, width, this.templateKeypoints_);
      };

      BoundingBoxTracker.prototype.track = function(pixels, width, height) {
        var blur = tracking.Image.blur(pixels, width, height, this.blur);
        var grayscale = tracking.Image.grayscale(blur, width, height);
        var keypoints = tracking.Fast.findCorners(grayscale, width, height, this.fastThreshold);
        var descriptors = tracking.Brief.getDescriptors(grayscale, width, keypoints);
        this.emit('track', {
          data: tracking.Brief.reciprocalMatch(this.templateKeypoints_, this.templateDescriptors_, keypoints, descriptors)
        });
      };

      // Track ===================================================================
      var boundingBox = document.getElementById('boundingBox');
      var boxLeft = 403;
      var video = document.getElementById('video');
      var canvas = document.getElementById('canvas');
      var canvasRect = canvas.getBoundingClientRect();
      var context = canvas.getContext('2d');
      var templateImageData;
      var capturing = false;
      var videoHeight = 295;
      var videoWidth = 393;

      var tracker = new BoundingBoxTracker();

      tracker.on('track', function(event) {
        stats.end();

        if (capturing) {
          return;
        }
        // Sorts best matches by confidence.
        event.data.sort(function(a, b) {
          return b.confidence - a.confidence;
        });
        // Re-draws template on canvas.
        context.putImageData(templateImageData, boxLeft, 0);

        // Plots lines connecting matches.
        var xTotal = 0;
        var yTotal = 0;
        var counter = 0;


        for (var i = 0; i < Math.min(templateNumber, event.data.length); i++) {
          var template = event.data[i].keypoint1;
          var frame = event.data[i].keypoint2;


          if (prevFramePoints.length > 0) {

            var diffX = frame[0] - prevFramePoints[i][0];
            var diffY = frame[1] - prevFramePoints[i][1];
            if(Math.abs(diffX) < 1 && Math.abs(diffY) < 1){
              // context.beginPath();
              // context.strokeStyle = 'magenta';
              // context.moveTo(frame[0], frame[1]);
              // context.lineTo(boxLeft + template[0], template[1]);
              // context.stroke();
              xTotal += frame[0];
              yTotal += frame[1];
              counter++;
            }

          }
          prevFramePoints[i][0] = frame[0];
          prevFramePoints[i][1] = frame[1];
        }
        // console.log(prevFramePoints);
        // console.log(counter);
        if (counter >= templateNumber) {
          var xAverage = xTotal / counter;
          var yAverage = yTotal / counter;

          context.beginPath();
          context.ellipse(xAverage, yAverage, 100, 100, 45 * Math.PI / 180, 0, 2 * Math.PI);
          context.stroke();
        }



      });

      var trackerTask = tracking.track(video, tracker, {
        camera: true
      });
      // Waits for the user to accept the camera.
      trackerTask.stop();

      // Sync video ============================================================
      function requestFrame() {
        window.requestAnimationFrame(function() {
          context.clearRect(0, 0, canvas.width, canvas.height);
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            try {
              context.drawImage(video, 0, 0, videoWidth, videoHeight);
            } catch (err) {}
          }
          requestFrame();
        });
      }
      requestFrame();

      // Bounding box drag =====================================================
      var initialPoint;
      var left;
      var top;
      var width;
      var height;
      canvas.addEventListener('mousedown', function(event) {
        initialPoint = [event.pageX, event.pageY];
        capturing = true;
      });
      canvas.addEventListener('mousemove', function(event) {
        if (capturing) {
          left = Math.min(initialPoint[0], event.pageX);
          top = Math.min(initialPoint[1], event.pageY);
          width = Math.max(initialPoint[0], event.pageX) - left;
          height = Math.max(initialPoint[1], event.pageY) - top;
          boundingBox.style.display = 'block';
          boundingBox.style.left = left + 'px';
          boundingBox.style.top = top + 'px';
          boundingBox.style.width = width + 'px';
          boundingBox.style.height = height + 'px';
        }
      });
      document.addEventListener('mouseup', function() {
        boundingBox.style.display = 'none';
        setTackerTemplate();
        capturing = false;
      });

      function setTackerTemplate() {
        var img = new Image();
        img.src = 'assets/pattern2-05.jpg';
        img.onload = function() {
          context.drawImage(img, boxLeft, 0, 200, 200);
          templateImageData = context.getImageData(boxLeft, 0, 200, 200);
          canvas.width = boxLeft + 200;
          context.putImageData(templateImageData, boxLeft, 0);
          trackerTask.stop();
          tracker.setTemplate(templateImageData.data, 200, 200);
          trackerTask.run();
        }

      }

      // GUI Controllers
      var gui = new dat.GUI();
      gui.add(tracker, 'fastThreshold', 20, 100).step(5);
      gui.add(tracker, 'blur', 1.1, 5.0).step(0.1);
