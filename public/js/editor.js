$(document).ready(function() {

    var stage = new Kinetic.Stage({
        container: 'container',
        width: 720,
        height: 570,
    });
    window.stage = stage;

    $('#update').click(function() {
        console.log('update video');
        stage.getLayers().each(function(layer) {
            kobject = layer.children[0];
            switch (kobject.getType()) {
                case "Group":
                    kimage = kobject.children[0];
                    removeElement(kimage.id);
                    kimage.id = Date.now();
                    addImage(kimage);
                    break;
                case "Shape":
                    ktext = kobject;
                    removeElement(ktext.id);
                    ktext.id = Date.now();
                    addBanner(ktext);
                    break;
            }
        });
    });

    $('#add').click(function() {
        addText($('#text').val());
        $('#text').val('');
    });

    $('#files').change(function () {
        processFiles(this.files);
    });

    var dropzone = $('#container');

    dropzone.on('dragover', function() {
        console.log('dragover');
        dropzone.addClass('hover');
        return false;
    });

    dropzone.on('dragleave', function() {
        console.log('dragleave');
        dropzone.removeClass('hover');
        return false;
    });

    dropzone.on('drop', function(e) {
        console.log('drop');
        e.stopPropagation();
        e.preventDefault();
        dropzone.removeClass('hover');
        var files = e.originalEvent.dataTransfer.files;
        processFiles(files);
        return false;
    });

    var processFiles = function(files) {
        if (files && typeof FileReader !== "undefined") {
            for(var i = 0; i < files.length; i++) {
                readFile(files[i]);
            }
        }
    };

    var readFile = function(file) {
        if( (/image/i).test(file.type) ) {
            var reader = new FileReader();
            reader.onload = function(e) {
                console.log('loaded ' + file.name);
                uploadImage(file);
                image = new Image();
                image.name = file.name;
                image.type = file.type;
                image.src = e.target.result;
                addImageToCanvas(image);
            };
            reader.readAsDataURL(file);
        } else {
            alert('File format not supported');
        }
    };

    var uploadImage = function(file) {
        var formdata = new FormData();
        formdata.append('uploadedFile', file);
        $.ajax({
            url: 'uploadImage',
            type: 'POST',
            data: formdata,
            processData: false,
            contentType: false,
            success: function(res) {
                console.log('uploaded ' + file.name);
            }
        });
    };

    var addText = function(text) {
        if (text == '') return;

        var layer = new Kinetic.Layer();

        var ktext = new Kinetic.Text({
            x: 0,
            y: 0,
            text: text,
            fontSize: 30,
            fontFamily: 'Calibri',
            fill: 'black',
            draggable: true,
        });
        ktext.id = Date.now();
        //window.ktext = ktext;

        layer.add(ktext);
        stage.add(layer);
        addElement(ktext);

        ktext.on('dragend', function() {
            var aPos = this.getAbsolutePosition();
            var w = this.getWidth();
            var h = this.getHeight();
            //move(this.id, aPos.x, aPos.y, '');
            console.log('dragend: to ' + aPos.x + ',' + aPos.y);
            $('#info').html('<pre>text: ' + this.getText() + '\nid: ' + this.id +
                            '\nwidth: ' + w + '\nheight: ' + h + '\nx: ' + aPos.x +
                            '\ny: ' + aPos.y + '\n</pre>');
        });
    };

    var addBanner = function(ktext) {
        var formdata = new FormData();
        var aPos = ktext.getAbsolutePosition();
        formdata.append('text', ktext.getText());
        formdata.append('id', ktext.id);
        formdata.append('top', aPos.y + 'px');
        formdata.append('left', aPos.x + 'px');
        formdata.append('bottom', '');
        formdata.append('right', '');
        formdata.append('width', Math.round(ktext.getWidth()) + 'px');
        formdata.append('height', Math.round(ktext.getHeight()) + 'px');
        formdata.append('background_color', '');
        formdata.append('color', ktext.attrs.fill);
        formdata.append('scroll', '');
        $.ajax({
            url: 'addBanner',
            type: 'POST',
            data: formdata,
            processData: false,
            contentType: false,
            success: function(res) {
                console.log('text added: ' + ktext.attrs.text);
            }
        });
    };

    var addImageToCanvas = function(image) {
        var x = Math.round((stage.getWidth() / 2) - (image.width / 2));
        var y = Math.round((stage.getHeight() / 2) - (image.height / 2));

        var group = new Kinetic.Group({
            x: x,
            y: y,
            draggable: true
        });

        var layer = new Kinetic.Layer();

        var kimage = new Kinetic.Image({
            x: 0,
            y: 0,
            image: image,
            width: image.width,
            height: image.height,
            name: 'image'
        });
        kimage.id = Date.now();

        layer.add(group);
        stage.add(layer);

        group.add(kimage);
        addAnchor(group, 0, 0, 'topLeft');
        addAnchor(group, image.width, 0, 'topRight');
        addAnchor(group, image.width, image.height, 'bottomRight');
        addAnchor(group, 0, image.height, 'bottomLeft');

        addElement(kimage);

        group.on('dragend', function() {
            var i = this.get('.image')[0];
            var aPos = i.getAbsolutePosition();
            var name = i.attrs.image.name;
            var w = i.attrs.width;
            var h = i.attrs.height;
            //move(i.id, aPos.x, aPos.y, '');
            console.log('dragend: to ' + aPos.x + ',' + aPos.y);
            $('#info').html('<pre>image: ' + name + '\nid: ' + i.id +
                            '\nwidth: ' + w + '\nheight: ' + h + '\nx: ' + aPos.x +
                            '\ny: ' + aPos.y + '\n</pre>');
        });

        stage.draw();
    };

    var addImage = function(kimage) {
        var group = kimage.parent;
        var formdata = new FormData();
        var aPos = kimage.getAbsolutePosition();
        formdata.append('images', kimage.attrs.image.name);
        formdata.append('id', kimage.id);
        formdata.append('top', aPos.y + 'px');
        formdata.append('left', aPos.x + 'px');
        formdata.append('bottom', '');
        formdata.append('right', '');
        formdata.append('width', Math.round(kimage.getWidth()) + 'px');
        formdata.append('height', Math.round(kimage.getHeight()) + 'px');
        $.ajax({
            url: 'addImage',
            type: 'POST',
            data: formdata,
            processData: false,
            contentType: false,
            success: function(res) {
                console.log('image added: ' + kimage.attrs.image.name);
            }
        });
    };

    var move = function(id, x, y, duration) {
        var formdata = new FormData();
        formdata.append('elements', id);
        formdata.append('x', x + 'px');
        formdata.append('y', y + 'px');
        formdata.append('duration', duration);
        $.ajax({
            url: 'move',
            type: 'POST',
            data: formdata,
            processData: false,
            contentType: false,
            success: function(res) {
                console.log('moved ' + id);
            }
        });
    };

    var removeElement = function(id) {
        var formdata = new FormData();
        formdata.append('elements', id);
        $.ajax({
            url: 'remove',
            type: 'POST',
            data: formdata,
            processData: false,
            contentType: false,
            success: function(res) {
                console.log('removed ' + id);
            }
        });
    };

    var addAnchor = function(group, x, y, name) {
        var stage = group.getStage();
        var layer = group.getLayer();

        var anchor = new Kinetic.Circle({
            x: x,
            y: y,
            stroke: '#666',
            fill: '#ddd',
            strokeWidth: 2,
            radius: 4,
            name: name,
            draggable: true,
            dragOnTop: false
        });

        anchor.on('dragmove', function() {
            update(this);
            layer.draw();
        });

        anchor.on('mousedown touchstart', function() {
            group.setDraggable(false);
            this.moveToTop();
        });

        anchor.on('dragend', function() {
            group.setDraggable(true);
            layer.draw();
        });

        anchor.on('mouseover', function() {
            var layer = this.getLayer();
            document.body.style.cursor = 'pointer';
            this.setStrokeWidth(4);
            layer.draw();
        });

        anchor.on('mouseout', function() {
            var layer = this.getLayer();
            document.body.style.cursor = 'default';
            this.setStrokeWidth(2);
            layer.draw();
        });

        group.add(anchor);
    };

    var update = function(activeAnchor) {
        var group = activeAnchor.getParent();

        var topLeft = group.get('.topLeft')[0];
        var topRight = group.get('.topRight')[0];
        var bottomRight = group.get('.bottomRight')[0];
        var bottomLeft = group.get('.bottomLeft')[0];
        var image = group.get('.image')[0];

        var anchorX = activeAnchor.getX();
        var anchorY = activeAnchor.getY();

        // update anchor positions
        switch (activeAnchor.getName()) {
            case 'topLeft':
                topRight.setY(anchorY);
                bottomLeft.setX(anchorX);
                break;
            case 'topRight':
                topLeft.setY(anchorY);
                bottomRight.setX(anchorX);
                break;
            case 'bottomRight':
                bottomLeft.setY(anchorY);
                topRight.setX(anchorX); 
                break;
            case 'bottomLeft':
                bottomRight.setY(anchorY);
                topLeft.setX(anchorX); 
                break;
        }

        image.setPosition(topLeft.getPosition());

        var width = topRight.getX() - topLeft.getX();
        var height = bottomLeft.getY() - topLeft.getY();
        if (width && height) {
            image.setSize(width, height);
        }
    };

    var addElement = function(el) {
        var a = $('<a/>').attr('href', '#').text('delete').click(function () {
            removeElement(el.id);
            el.getLayer().destroy();
            $(this).parent().remove();
        });
        if (el.className == 'Image') {
            liText = el.attrs.image.name + ' ';
        } else {
            liText = el.attrs.text + ' ';
        }
        var li = $('<li/>').text(liText).append(a);
        $('#elements ul').append(li);
    };

});

