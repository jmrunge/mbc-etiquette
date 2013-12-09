module.exports = function(server) {
    var path = require('path')
    , folio = require('folio')
    , jade = require('jade')
    , po2json = require('po2json')
    , i18n = require('i18n-abide')
    , _ = require('underscore')
    , fs  = require('fs')
    , mbc = require('mbc-common')
    , conf = mbc.config.Webvfx
    , logger  = mbc.logger().addLogger('webvfx_routes')
    , imageFiles = []
    , watchr  = require('watchr')
    , url = require('url')
    , elements = []
    , events = []
    ;

    var self = require ('mbc-common/models/App.js')
    , appCollection = new self.Collection();

    var accessControl = function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        next();
    };

    accessRoutes = [ '/events', '/init', '/addImage', '/addBanner', '/remove', '/addEffect', '/move', '/uploadImage' ];
    _.each(accessRoutes, function(route) {
        server.all(route, accessControl);
    });

    server.get("/events", function(req, res) {
        var event = _.findWhere(events, {consumed: false});
        if (event) {
            logger.debug(event);
            event.consumed = true;
            res.json(event);
        } else {
            logger.debug('Event: NONE');
            res.json({"type": "none"});
        }
    });

    server.get("/init", function(req, res) {
        logger.debug(elements);
        res.json({elements: elements});
        events = _.reject(events, function(event) {
            return event.type === 'add' || event.type === 'remove';
        });
    });

    server.post('/addImage', function(req, res){
        conf.Dirs.uploads
        var full_url = url.format( { protocol: req.protocol, host: req.get('host'), pathname: 'uploads/' + req.body.images });
        var element = {};
        element.id = req.body.id;
        element.type = 'image';
        element.src = full_url;
        element.top = req.body.top;
        element.left = req.body.left;
        element.bottom = req.body.bottom;
        element.right = req.body.right;
        element.height = req.body.height;
        element.width = req.body.width;
        var event = {};
        event.type = 'addImage';
        event.element = element;
        event.consumed = false;
        events.push(event);
        elements.push(element);
        return res.json({});
    });

    server.post('/addBanner', function(req, res){
        var element = {};
        element.id = req.body.id;
        element.type = 'banner';
        element.top = req.body.top;
        element.left = req.body.left;
        element.bottom = req.body.bottom;
        element.right = req.body.right;
        element.height = req.body.height;
        element.width = req.body.width;
        element.background_color = req.body.background_color;
        element.color = req.body.color;
        element.text = req.body.text;
        element.scroll = req.body.scroll;
        var event = {};
        event.type = 'addBanner';
        event.element = element;
        event.consumed = false;
        events.push(event);
        elements.push(element);
        return res.json({});
    });

    server.post('/remove', function(req, res){
        var element = {};
        element.id = req.body.elements;
        var event = {};
        event.type = 'remove';
        event.element = element;
        event.consumed = false;
        events.push(event);
        elements = _.reject(elements, function(item) {
            return item.id === element.id;
        });
        return res.json({});
    });

    server.post('/addEffect', function(req, res){
        var element = {};
        element.id = req.body.elements;
        var animation = {};
        animation.name = req.body.effects;
        animation.duration = req.body.duration;
        animation.iterations = req.body.iterations;
        animation.delay = req.body.delay;
        var event = {};
        event.type = 'animation';
        event.element = element;
        event.animation = animation;
        event.consumed = false;
        events.push(event);
        return res.json({});
    });

    server.post('/move', function(req, res){
        var element = {};
        element.id = req.body.elements;
        var move = {};
        move.x = req.body.x;
        move.y = req.body.y;
        move.duration = req.body.duration;
        var event = {};
        event.type = 'move';
        event.element = element;
        event.move = move;
        event.consumed = false;
        events.push(event);
        return res.json({});
    });

    server.post('/uploadImage', function(req, res){
        fs.readFile(req.files.uploadedFile.path, function (err, data) {
            if(err) {
                logger.error('Uploading file: ' + err);
                return;
            }
            var newPath = path.join(conf.Dirs.uploads, req.files.uploadedFile.name);
            fs.writeFile(newPath, data, function (err) {
                return res.json({});
            });
        });
    });

    server.get('/live.webm', function(req, res) {
        if(conf.Editor.stream_url) {
            res.redirect(conf.Editor.stream_url);
        } else {
            res.json({});
        }
    });

    server.get('/po/:id', function (req, res) {
        var lang = req.params.id;
        var locale = i18n.localeFrom(lang);
        var jsondata = '';
        try {
            jsondata = po2json.parseSync('locale/' + locale + '/LC_MESSAGES/messages.po');
            res.send (jsondata);
        } catch (e) {
            logger.error(e);
        }
    });

    /**
     * Vendor Javascript Package
     */

    var lib_dir = path.join(__dirname, '..', 'vendor')

    var vendorJs = new folio.Glossary([
        require.resolve('jquery-browser/lib/jquery.js'),
        require.resolve('jqueryui-browser/ui/jquery-ui.js'),
        require.resolve('underscore/underscore.js'),
        require.resolve('backbone/backbone.js'),
        require.resolve('jed'),
        require.resolve('knockout/build/output/knockout-latest.js'),
        require.resolve('knockback/knockback-core.js'),
        path.join(lib_dir, 'kinetic-v4.5.2.min.js'),
        path.join(lib_dir, 'backbone.modal-min.js'),
        require.resolve('backbone-pageable/lib/backbone-pageable.js'),
    ], {minify: false}); //XXX Hack Dont let uglify minify this: too slow

    // serve using express
    server.get('/js/vendor.js', folio.serve(vendorJs));


    /**
     * Views Javascript Package
     */
    var localViews = [ 'header' ];
    var commonViews = [ 'editor' ];

    var localViewsFiles  = localViews.map( function(e) {
        return path.join(__dirname, '..', 'public/js/views/', e + '.js');
    });
    var commonViewsFiles = commonViews.map( function(e) {
        return require.resolve('mbc-common/views/js/' + e);
    });

    var viewsJs = new folio.Glossary(
        localViewsFiles.concat(commonViewsFiles),
        { minify:server.get('minify') }
    );

    server.get('/js/views.js', folio.serve(viewsJs));

    /**
     * Models Javascript Package
     */

    var models = ['Default', 'App', 'Editor', 'Sketch'];

    var modelsJs = new folio.Glossary(
        models.map (function (e) {
            return require.resolve('mbc-common/models/' + e);
        })
    );

    server.get('/js/models.js', folio.serve(modelsJs));


    /**
     * Template Javascript Package
     *
     * We are going to use pre-compiled
     * jade on the client-side.
     */

    var localTemplates = ['header'];

    var commonTemplates = ['editor',
                           'objects',
                           'alert',
                           'confirm',
                           'prompt',
                          ];

    var getFileName = function (e) {
        return path.join(__dirname, '..', 'views/templates/', e + '.jade');
    };

    var getCommonFileName = function (e) {
        return require.resolve('mbc-common/views/templates/' + e + '.jade');
    };

    var templateJs = new folio.Glossary([
        require.resolve('jade/runtime.js'),
        path.join(__dirname, '..', 'views/templates/js/header.js')].concat(
            localTemplates.map(getFileName), commonTemplates.map(getCommonFileName)
        ),
        {
        compilers: {
            jade: function (name, source) {
                return 'template[\'' + name + '\'] = ' +
                    jade.compile(source, {
                        filename: getFileName(name),
                        client: true,
                        compileDebug: false
                    }) + ';';
            }
        }
    });

    // serve using express
    server.get('/js/templates.js', folio.serve(templateJs));

    server.get('*',  function(req, res) {
        res.render('index', { name: conf.Branding.name, description: conf.Branding.description });
    });

    return appCollection;

}