(function (s) {
    function ZoomSlider(element, options) {
        this.element = element;
        this.$el = s(element);
        this._defaults = defaults;
        this._name = pluginName;

        var dataAttributes = this.$el.data();
        var customOptions = {};

        for (var attribute in dataAttributes) {
            if (dataAttributes.hasOwnProperty(attribute) && attribute.match(/zs[A-Z]/)) {
                var key = attribute.substr(2);
                key = key.charAt(0).toLowerCase() + key.slice(1);
                customOptions[key] = dataAttributes[attribute];
            }
        }

        this.settings = s.extend({}, defaults, customOptions, options);

        if (this.settings.src === null || this.settings.src.length < 1) {
            console.error("ZoomSlider terminated - invalid input.");
            return;
        }

        this.init();
    }

    var pluginName = "zoomSlider";
    var defaults = {
        src: null,
        speed: 8000,
        switchSpeed: 800,
        interval: 4500,
        autoplay: true,
        bullets: true,
        overlay: "dots"
    };

    s.extend(ZoomSlider.prototype, {
        init: function () {
            if (!Array.isArray(this.settings.src)) {
                this.settings.src = [this.settings.src];
            }

            this.transEndEventNames = {
                WebkitTransition: "webkitTransitionEnd",
                MozTransition: "transitionend",
                OTransition: "oTransitionEnd",
                msTransition: "MSTransitionEnd",
                transition: "transitionend"
            };

            this.transEndEventName = this.transEndEventNames[Modernizr.prefixed("transition")];
            this.support = Modernizr.csstransitions && Modernizr.csstransforms;

            var transformProperty = Modernizr.prefixed("transform");
            transformProperty = transformProperty.replace(/([A-Z])/g, function (match, p1) {
                return "-" + p1.toLowerCase();
            }).replace(/^ms-/, "-ms-");

            this.transitionProp = {
                transition: transformProperty + " " + this.settings.speed + "ms ease-out, opacity " + this.settings.switchSpeed + "ms"
            };

            this.numSlides = this.settings.src.length;

            switch (this.$el.css("position")) {
                case "relative":
                case "absolute":
                case "fixed":
                    break;
                default:
                    this.$el.css("position", "relative");
            }

            var self = this;
            var image = s("<img />");

            image.load(function () {
                self.numSlides === 1 ? self.initSingle() : self.initSlideshow();
            });

            image.attr("src", this.settings.src[0]);
        },

        initSlideshow: function () {
            var self = this;
            var slideshow = s('<div class="zs-slideshow"></div>');
            var slidesContainer = s('<div class="zs-slides"></div>');
            var bulletsContainer = s('<div class="zs-bullets"></div>');

            for (var i = 0; i < this.numSlides; i++) {
                var slide = s('<div class="zs-slide zs-slide-' + i + '"></div>');
                slide.css({"background-image": "url('" + this.settings.src[i] + "')"}).appendTo(slidesContainer);

                var bullet = s('<div class="zs-bullet zs-bullet-' + i + '"></div>');
                bullet.appendTo(bulletsContainer);

                if (i === 0) {
                    slide.addClass("active").css("opacity", 1);
                    bullet.addClass("active");
                }
            }

            this._promoteChildren();

            slideshow.append(slidesContainer).prependTo(this.$el);

            if (this.settings.bullets) {
                slideshow.append(bulletsContainer);

                slideshow.on("click", ".zs-bullet", function () {
                    self.jump(s(this).index());
                });
            }

            this.pos = 0;
            this.pending = null;
            this.switching = false;
            this.$slideshow = slideshow;
            this.$slides = slidesContainer.children(".zs-slide");
            this.$bullets = bulletsContainer.children(".zs-bullet");
            this.$el.addClass("zs-enabled");

            if (this.settings.overlay === "dots") {
                this.$el.addClass("overlay-dots");
            } else if (this.settings.overlay === "plain") {
                this.$el.addClass("overlay-plain");
            }

            if (this.support) {
                var firstSlide = this.$slides.eq(0);
                firstSlide.css("opacity", 0).css(this.transitionProp);

                setTimeout(function () {
                    firstSlide.css({
                        opacity: 1,
                        transform: "scale(1.0, 1.0)",
                        "z-index": 2
                    });
                }, 50);
            }

            if (this.settings.autoplay) {
                this.play();
            }
        },

        initSingle: function () {
            var self = this;
            var slideshow = s('<div class="zs-slideshow"></div>');
            var slidesContainer = s('<div class="zs-slides"></div>');
            var slide = s('<div class="zs-slide zs-slide-0"></div>');

            slide.css({"background-image": "url('" + this.settings.src[0] + "')"}).appendTo(slidesContainer);
            slide.addClass("active").css("opacity", 1);

            this._promoteChildren();

            slideshow.append(slidesContainer).prependTo(this.$el);
            this.$el.addClass("zs-enabled");

            if (this.settings.overlay === "dots") {
                this.$el.addClass("overlay-dots");
            } else if (this.settings.overlay === "plain") {
                this.$el.addClass("overlay-plain");
            }

            if (this.support) {
                slide.css("opacity", 0).css(this.transitionProp);

                setTimeout(function () {
                    slide.css({
                        opacity: 1,
                        transform: "scale(1.0, 1.0)",
                        "z-index": 2
                    });
                }, 50);
            }
        },

        _promoteChildren: function () {
            this.$el.children().each(function () {
                var $this = s(this);
                if ($this.css("z-index") === "auto") {
                    $this.css("z-index", 2);
                }

                if ($this.css("position") === "static") {
                    $this.css("position", "relative");
                }
            });
        },

        jump: function (index) {
            if (index >= this.numSlides) {
                console.log("ZoomSlider: jump(pos) aborted. Supplied index out of range.");
                return;
            }

            if (this.pos !== index) {
                if (this.switching) {
                    this.pending = index;
                    return;
                }

                var self = this;
                var currentSlide = this.$slides.eq(this.pos);
                var nextSlide = this.$slides.eq(index);

                if (this.support) {
                    this.switching = true;
                    currentSlide.css("z-index", 1);

                    nextSlide.addClass("active").css(this.transitionProp).css({
                        opacity: 1,
                        transform: "scale(1.0, 1.0)",
                        "z-index": 2
                    }).on(this.transEndEventName, function (event) {
                        if (event.originalEvent.propertyName === "opacity") {
                            var lastSlideBg = currentSlide.css("background-image");
                            currentSlide.removeClass("active").removeAttr("style").css("background-image", lastSlideBg);
                            nextSlide.off(self.transEndEventName);
                            self.switching = false;

                            if (self.pending !== null) {
                                setTimeout(function () {
                                    var pendingIndex = self.pending;
                                    self.pending = null;
                                    self.$bullets.eq(pendingIndex).click();
                                }, 30);
                            }
                        }
                    });
                } else {
                    currentSlide.removeClass("active");
                    nextSlide.addClass("active");
                }

                this.$bullets.eq(this.pos).removeClass("active");
                this.$bullets.eq(index).addClass("active");
                this.pos = index;

                if (this.settings.autoplay) {
                    this.play();
                }
            }
        },

        prev: function () {
            var index = this.pos - 1;
            if (index < 0) {
                index = this.numSlides - 1;
            }

            this.jump(index);
        },

        next: function () {
            var index = this.pos + 1;
            if (index >= this.numSlides) {
                index = 0;
            }

            this.jump(index);
        },

        play: function () {
            if (this.timer !== null) {
                clearInterval(this.timer);
            }

            var self = this;
            this.settings.autoplay = true;

            this.timer = setInterval(function () {
                self.next();
            }, this.settings.interval);
        },

        stop: function () {
            this.settings.autoplay = false;
            clearInterval(this.timer);
            this.timer = null;
        }
    });

    s.fn[pluginName] = function (options) {
        return this.each(function () {
            if (!s.data(this, "plugin_" + pluginName)) {
                s.data(this, "plugin_" + pluginName, new ZoomSlider(this, options));
            }
        });
    };

    var elementsWithDataAttribute = s("[data-zs-src]");

    if (elementsWithDataAttribute.length > 0) {
        elementsWithDataAttribute.each(function () {
            s(this).zoomSlider();
        });
    }
})(jQuery, window, document);
