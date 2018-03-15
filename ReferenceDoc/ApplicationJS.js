'use strict'
var app;
(function () {
    app = angular.module("Thermochem", ['ngRoute', 'angular-linq', 'ngMessages', 'angularMoment', 'ui.bootstrap', 'angular-confirm', 'ngCookies', 'ngDialog', 'dx'], function ($httpProvider) {
        // Use x-www-form-urlencoded Content-Type
        $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';

        /**
         * The workhorse; converts an object to x-www-form-urlencoded serialization.
         * @param {Object} obj
         * @return {String}
         */
        var param = function (obj) {
            var query = '', name, value, fullSubName, subName, subValue, innerObj, i;

            for (name in obj) {
                value = obj[name];

                if (value instanceof Array) {
                    for (i = 0; i < value.length; ++i) {
                        subValue = value[i];
                        fullSubName = name + '[' + i + ']';
                        innerObj = {};
                        innerObj[fullSubName] = subValue;
                        query += param(innerObj) + '&';
                    }
                }
                else if (value instanceof Object) {
                    for (subName in value) {
                        subValue = value[subName];
                        fullSubName = name + '[' + subName + ']';
                        innerObj = {};
                        innerObj[fullSubName] = subValue;
                        query += param(innerObj) + '&';
                    }
                }
                else if (value !== undefined && value !== null)
                    query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
            }

            return query.length ? query.substr(0, query.length - 1) : query;
        };

        // Override $http service's default transformRequest
        $httpProvider.defaults.transformRequest = [function (data) {
            return angular.isObject(data) && String(data) !== '[object File]' ? param(data) : data;
        }];
    });
})();

app.filter('NumFilter', function () {
    return function (num, NumDecimals) {
        if (typeof (num) != 'undefined') {
            num = Number(num);
            return num.toFixed(NumDecimals)
        }
        return num;
    }
})

app.factory('ngEncryption', function () {
    return {
        encrypt: function (dataForEncrypt) {
            var str = dataForEncrypt;
            var xmlParams = $.cookie('ClientNLPublicKey');
            // Create a new instance of RSACryptoServiceProvider.
            var rsa = new System.Security.Cryptography.RSACryptoServiceProvider();
            var reqArray = [];
            var reqArraySize = 200;
            if (str.length < reqArraySize) {
                var data = System.Text.Encoding.UTF8.GetBytes(str);
                // Import parameters from xml.
                rsa.FromXmlString(xmlParams);
                // Encrypt data (use OAEP padding).
                var encryptedBytes = rsa.Encrypt(data, true);
                // Convert encrypted data to Base64.
                var encryptedString = System.Convert.ToBase64String(encryptedBytes)
                // Replace plain password with encrypted data.
                reqArray.push(encryptedString);
                //break;
            }
            else {
                var MaxCounterHeader = parseInt(Math.ceil(parseFloat(str.length / 200)));
                for (i = 0; i < MaxCounterHeader; i++) {
                    var newstring = str.substr(0, str.length > 200 ? 200 : str.length);
                    var data = System.Text.Encoding.UTF8.GetBytes(newstring);
                    rsa.FromXmlString(xmlParams);
                    var encryptedBytes = rsa.Encrypt(data, true);
                    // Convert encrypted data to Base64.
                    var encryptedString = System.Convert.ToBase64String(encryptedBytes)
                    reqArray.push(encryptedString);
                    str = str.replace(newstring, '');
                }
            }
            return JSON.stringify(reqArray);
        }
    };
});

app.factory('httpInterceptor', ['$q', '$rootScope', '$log', '$location', 'DataService', function ($q, $rootScope, $log, $location, DataService) {
    var numLoadings = 0;
    return {
        request: function (config) {
            if (config.url.charAt(0) == "/") {
                config.url = config.url.slice(1);
                config.url = window.MyApp.rootPath + config.url;
            }

            numLoadings++;
            //Show loader
            if (config.HideLoader == false || config.HideLoader == undefined) {
                $rootScope.$broadcast("loader_show");
                $('button:not([ng-disabled])').prop('disabled', true);
            }
            $rootScope.DisableButton = true;

            return config || $q.when(config)
        },
        response: function (response) {
            // Hide loader
            if ((--numLoadings) === 0)
                $rootScope.$broadcast("loader_hide");

            $('button:not([ng-disabled])').prop('disabled', false);
            $rootScope.DisableButton = false;

            if (response.status == "203") {
                var preservedData = { "LicenceExpiredMsg": response.data }
                DataService.SetServiceData(preservedData);
                $location.path("/WelcomeScreen");
                response.status = 202;
            }
            if (response.status == "204")
                $location.path("/Logout");
            return response || $q.when(response);
        },
        responseError: function (response) {
            // Hide loader
            if (!(--numLoadings))
                $rootScope.$broadcast("loader_hide");
            return $q.reject(response);
        }
    };
}])

.config(function ($httpProvider) {
    $httpProvider.useApplyAsync(true);
    $httpProvider.interceptors.push('httpInterceptor');
});

app.directive('onFinishRender', function ($timeout) {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit(attr.onFinishRender);
                });
            }
        }
    }
});

app.directive('validDate', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, control) {
            control.$parsers.push(function (viewValue) {
                var newDate = control.$viewValue;
                control.$setValidity("invalidDate", true);
                if (typeof newDate === "object" || newDate == "") return newDate;  // pass through if we clicked date from popup
                if (!newDate.match(/^\d{1,2}\/\d{1,2}\/((\d{2})|(\d{4}))$/))
                    control.$setValidity("invalidDate", false);
                return viewValue;
            });
        }
    };
});

app.directive('resize', ['$window', function ($window) {
    return function (scope, element) {
        var w = angular.element($window);
        scope.getWindowDimensions = function () {
            return {
                'h': w.height(),
                'w': w.width()
            };
        };
        scope.$watch(scope.getWindowDimensions, function (newValue, oldValue) {
            scope.windowHeight = newValue.h;
            scope.windowWidth = newValue.w;

            var header_height = $('header').height();
            var footer_height = $('footer').height();
            var pagetab_height = $('.pagestab').height();
            var topbar_height = $('.topbar').height() != null ? $('.topbar').height() : 0;
            var controlul_height = $('.control-ul').height() != null ? $('.control-ul').height() : 0;

            var total_height = header_height + footer_height + pagetab_height + topbar_height + controlul_height + 14;

            scope.style = function () {
                return {
                    'height': (newValue.h - total_height) + 'px',
                    'overflow-y': 'auto'

                };
            };

        }, true);

        w.bind('resize', function () {
            scope.$apply();
        });
    }
}]);

app.directive('numbersOnly', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, modelCtrl) {
            modelCtrl.$parsers.push(function (inputValue) {
                // this next if is necessary for when using ng-required on your input. 
                // In such cases, when a letter is typed first, this parser will be called
                // again, and the 2nd time, the value will be undefined                
                if (inputValue == null) inputValue = '';
                inputValue = inputValue.toString();
                if (inputValue == undefined) return ''
                var transformedInput = inputValue.replace(/[^0-9]/g, '');
                if (transformedInput != inputValue) {
                    modelCtrl.$setViewValue(transformedInput);
                    modelCtrl.$render();
                }
                return transformedInput;
            });
        }
    };
});

app.directive('numbersWithDefaultZero', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, modelCtrl) {
            modelCtrl.$parsers.push(function (inputValue) {
                // this next if is necessary for when using ng-required on your input. 
                // In such cases, when a letter is typed first, this parser will be called
                // again, and the 2nd time, the value will be undefined                   
                if (inputValue == null) inputValue = '';
                inputValue = inputValue.toString();
                if (inputValue == undefined) return ''
                var transformedInput = inputValue.replace(/[^0-9]/g, '');
                if (transformedInput != inputValue) {
                    modelCtrl.$setViewValue(transformedInput);
                    modelCtrl.$render();
                }
                transformedInput = Number(transformedInput).toString();
                modelCtrl.$setViewValue(transformedInput);
                modelCtrl.$render();
                return transformedInput;
            });
        }
    };
});

app.directive('numbersWithnegative', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, modelCtrl) {
            modelCtrl.$parsers.push(function (inputValue) {
                // this next if is necessary for when using ng-required on your input. 
                // In such cases, when a letter is typed first, this parser will be called
                // again, and the 2nd time, the value will be undefined                   
                if (inputValue == null) inputValue = '';
                inputValue = inputValue.toString();
                if (inputValue == undefined) return ''
                var transformedInput = inputValue.replace(/[^-?0-9]/g, '');
                if (transformedInput.lastIndexOf('-') > 0) {
                    transformedInput = transformedInput.slice(0, -1);
                }
                if (transformedInput != inputValue) {
                    modelCtrl.$setViewValue(transformedInput);
                    modelCtrl.$render();
                }
                return transformedInput;
            });

            element.on("blur", function () {
                var val = modelCtrl.$modelValue;
                if (val == '-') {
                    val = 0;
                }
                modelCtrl.$setViewValue(val);
                modelCtrl.$render();
                return val;
            });
        }
    };
});

app.directive('numbersWithdecimal', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, modelCtrl) {
            modelCtrl.$parsers.push(function (inputValue) {
                if (inputValue == undefined) return ''
                var transformedInput = inputValue.replace(/[^0-9'-.]*$/g, '');
                if (transformedInput != inputValue) {
                    modelCtrl.$setViewValue(transformedInput);
                    modelCtrl.$render();
                }

                return transformedInput;
            });
        }
    };
});

app.directive('jqdatetimepicker', function () {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {
            $(function () {
                element.datetimepicker({
                    format: 'm/d/Y H:i',
                    step: 5,
                    initTime: false
                });
            });

            scope.$on('$destroy', function () {
                element.remove();
            });
        }
    };
});

app.directive('jtimepicker', ['$filter', '$window', '$parse', '$timeout', function ($filter, $window, $parse, $timeout) {
    return {
        require: '?ngModel',
        restrict: 'A',
        compile: function () {
            var moment = $window.moment;
            var getter, setter;
            return function (scope, element, attrs, ngModel) {
                //Declaring the getter and setter
                getter = $parse(attrs.ngModel);
                setter = getter.assign;
                //Set the initial value to the View and the Model
                ngModel.$formatters.unshift(function (modelValue) {
                    if (!modelValue) return "";
                    var retVal = modelValue;
                    setter(scope, retVal);
                    // console.log('Set initial View/Model value from: ' + modelValue + ' to ' + retVal);
                    return retVal;
                });

                // If the ngModel directive is used, then set the initial value and keep it in sync
                if (ngModel) {
                    element.on('blur', function (event) {
                        if (ngModel.$modelValue != "" && ngModel.$modelValue != undefined) {
                            if (ngModel.$modelValue.indexOf(":") > 0) {
                                scope.$apply(function () {
                                    setter(scope, ngModel.$modelValue);
                                });
                            }
                            else {
                                if (ngModel.$modelValue.length > 4) {
                                    var newValue = '00' + ':' + '00';
                                    scope.$apply(function () {
                                        setter(scope, newValue);
                                    });
                                }
                                else if (ngModel.$modelValue.length <= 3) {
                                    if (ngModel.$modelValue.length < 3) {
                                        if (ngModel.$modelValue.length < 2) {
                                            var newValue = '0' + ngModel.$modelValue.slice(0, 1) + ':' + '00';
                                            scope.$apply(function () {
                                                setter(scope, newValue);
                                            });
                                        }
                                        else if (ngModel.$modelValue.length == 2 && ngModel.$modelValue > 23) {
                                            var newValue = '0' + ngModel.$modelValue.slice(0, 1) + ':' + '0' + ngModel.$modelValue.slice(1, 2);
                                            scope.$apply(function () {
                                                setter(scope, newValue);
                                            });
                                        }
                                        else {
                                            var newValue = ngModel.$modelValue.slice(0, 2) + ':' + '00';
                                            scope.$apply(function () {
                                                setter(scope, newValue);
                                            });
                                        }
                                    }
                                    else if (ngModel.$modelValue.length == 3 && (ngModel.$modelValue.slice(1, 3) > 59)) {
                                        var newValue = '0' + ngModel.$modelValue.slice(0, 1) + ':' + '0' + ngModel.$modelValue.slice(1, 2);
                                        scope.$apply(function () {
                                            setter(scope, newValue);
                                        });
                                    }
                                    else {
                                        var newValue = '0' + ngModel.$modelValue.slice(0, 1) + ':' + ngModel.$modelValue.slice(1);
                                        scope.$apply(function () {
                                            setter(scope, newValue);
                                        });
                                    }
                                }
                                else {
                                    if (ngModel.$modelValue.length == 4 && ngModel.$modelValue.slice(0, 2) > 23) {
                                        var newValue = '00' + ':' + '00';
                                    }
                                    else if (ngModel.$modelValue.length == 4 && (ngModel.$modelValue.slice(2, 4) > 59)) {
                                        var newValue = '00' + ':' + '00';
                                        scope.$apply(function () {
                                            setter(scope, newValue);
                                        });
                                    }
                                    else {
                                        var newValue = ngModel.$modelValue.slice(0, 2) + ':' + ngModel.$modelValue.slice(2);
                                    }
                                    scope.$apply(function () {
                                        setter(scope, newValue);
                                    });
                                }
                            }
                        }
                    });
                }
            };
        },
        link: function (scope, element) {
            scope.$on('$destroy', function () {
                element.remove();
            });
        }
    };
}]);

app.directive('validEmail', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, control) {
            control.$parsers.push(function (viewValue) {
                var newEmail = control.$viewValue;
                control.$setValidity("invalidEmail", true);
                if (typeof newEmail === "object" || newEmail == "") return newEmail;  // pass through if we clicked date from popup
                if (!newEmail.match(/^(([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5}){1,25})+([;,.](([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5}){1,25})+)*$/))
                    control.$setValidity("invalidEmail", false);
                return viewValue;
            });
        }
    };
});

app.directive('validZipcode', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, control) {
            control.$parsers.push(function (viewValue) {
                var zipcode = control.$viewValue;
                control.$setValidity("invalidZipCode", true);
                if (typeof zipcode === "object" || zipcode == "") return zipcode;  // pass through if we clicked date from popup
                if (!zipcode.match(/^\d{5}(-\d{4})?$/))
                    control.$setValidity("invalidZipCode", false);
                return viewValue;
            });
        }
    };
});

app.directive("loader", ['$rootScope', function ($rootScope) {

    return function ($scope, element, attrs) {
        $scope.$on("loader_show", function () {
            return element.show();
        });
        return $scope.$on("loader_hide", function () {
            return element.hide();
        });
    };
}]);

app.directive('myEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.myEnter);
                });

                event.preventDefault();
            }
        });
    };
});

angular.module('Application_TimeOut', []);
app.run(function ($rootScope, $timeout, $document, $location, $http) {
    $(document).ready(function () {
        $(document).idleTimeout({
            redirectUrl: "/Logout",
            idleTimeLimit: 300,    // 5 Minutes          
            activityEvents: 'click keypress scroll wheel mousewheel keydown keyup mousemove DOMMouseScroll mousewheel mousedown touchstart touchmove focus',
            enableDialog: false,
            sessionKeepAliveTimer: false
        });
    });
})

app.directive('myTab', ['$window', '$parse', function ($window, $parse) {

    return {
        require: '?ngModel',
        restrict: 'A',
        compile: function () {
            var moment = $window.moment;
            var getter, setter;
            return function (scope, element, attrs, ngModel) {

                //Declaring the getter and setter
                getter = $parse(attrs.ngModel);
                setter = getter.assign;
                //Set the initial value to the View and the Model
                ngModel.$formatters.unshift(function (modelValue) {
                    if (!modelValue) return "";
                    var retVal = modelValue;
                    setter(scope, retVal);
                    // console.log('Set initial View/Model value from: ' + modelValue + ' to ' + retVal);
                    return retVal;
                });
                // If the ngModel directive is used, then set the initial value and keep it in sync
                if (ngModel) {
                    element.bind("keydown keypress", function (event) {
                        if (event.which === 9) {
                            if (ngModel.$modelValue != "" && ngModel.$modelValue != undefined) {
                                scope.$apply(function () {
                                    scope.$eval(attrs.myTab);
                                });
                                element.next().focus();
                            }
                            else {
                                element.next().focus();
                            }

                        }
                    });
                }
            };
        }
    }

}]);

app.directive('myBlur', ['$window', '$parse', function ($window, $parse) {

    return {
        require: '?ngModel',
        restrict: 'A',
        compile: function () {
            var moment = $window.moment;
            var getter, setter;
            return function (scope, element, attrs, ngModel) {

                //Declaring the getter and setter
                getter = $parse(attrs.ngModel);
                setter = getter.assign;
                //Set the initial value to the View and the Model
                ngModel.$formatters.unshift(function (modelValue) {
                    if (!modelValue) return "";
                    var retVal = modelValue;
                    setter(scope, retVal);
                    // console.log('Set initial View/Model value from: ' + modelValue + ' to ' + retVal);
                    return retVal;
                });
                // If the ngModel directive is used, then set the initial value and keep it in sync
                if (ngModel) {

                    element.bind("keydown keypress", function (event) {
                        if (event.which === 9 || event.which === 13) {
                            if (ngModel.$modelValue != "" && ngModel.$modelValue != undefined) {
                                scope.$apply(function () {
                                    scope.$eval(attrs.myBlur);
                                });
                                if (event.which == 13) {
                                    event.preventDefault();
                                    if (this.tabIndex != 0) {
                                        var $next = $('[tabIndex=' + (+this.tabIndex + 1) + ']');
                                        if (!$next.length) {
                                            $next = $('[tabIndex=1]');
                                        }
                                        $next.focus();
                                    }
                                }
                            }

                        }
                    });
                    element.on('blur', function (event) {
                        if (ngModel.$modelValue != "" && ngModel.$modelValue != undefined) {
                            scope.$apply(function () {
                                scope.$eval(attrs.myBlur);
                            });
                            element.next().focus();
                        }
                        else {
                            element.next().focus();
                        }

                    });
                }
            };
        }
    }

}]);

app.factory("DataService", function myfunction() {
    var data = {};

    return {
        SetServiceData: SetServiceData,
        GetServiceData: GetServiceData,
        ResetServiceData: ResetServiceData

    };

    function SetServiceData(objDtl) {
        data = objDtl;
    }

    function GetServiceData() {
        return data;
    }

    function ResetServiceData() {
        data = {};
        return data;
    }


});

app.directive('jqdatepicker', ['$parse', '$timeout', function ($parse, $timeout) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attrs, ngModel) {
            var getter, setter;
            $timeout(function () {
                element.datepicker({
                    dateFormat: 'dd/mm/yy',
                    changeMonth: true,
                    changeYear: true,
                    onClose: function (dateText, inst) {
                        angular.element(element).trigger('dateUpdate');
                    }
                })

                getter = $parse(attrs.ngModel);
                setter = getter.assign;

                ngModel.$formatters.unshift(function (modelValue) {
                    if (!modelValue) return "";
                    var retVal = modelValue;
                    setter(scope, retVal);
                    return retVal;
                });

                element.on('dateUpdate', function (event) {
                    if (element[0].value !== undefined && element[0].value !== null && element[0].value != "") {
                        var NewDate = "";
                        var NewDate1 = "";
                        var MinDate = "01/01/1753";
                        var MaxDate = "12/31/9999";
                        var date = new Date();
                        var day = ("0" + date.getDate()).slice(-2);
                        var month = ("0" + (date.getMonth() + 1)).slice(-2)
                        if (isDate(element[0].value)) {
                            if (element[0].value.indexOf("/") == -1 || element[0].value.indexOf("-") > -1) {
                                scope.$apply(function () {
                                    setter(scope, CurrDate());
                                });
                            }
                            var date1 = element[0].value.split("/")[0];
                            var Month = element[0].value.split("/")[1];
                            var dtYear = element[0].value.split("/")[2];

                            if (dtYear.length == "") {
                                dtYear = date.getFullYear();
                            }
                            if (dtYear.length == 1) {
                                dtYear = "200" + dtYear;
                            }
                            else if (dtYear.length == 2) {
                                dtYear = "20" + dtYear;
                            }
                            else if (dtYear.length == 3) {
                                dtYear = "2" + dtYear;
                            }

                            NewDate = date1 + "/" + Month + "/" + dtYear;
                            NewDate1 = Month + "/" + date1 + "/" + dtYear;

                            if (Date.parse(NewDate1) >= Date.parse(MaxDate) || Date.parse(NewDate1) <= Date.parse(MinDate)) {
                                scope.$apply(function () {
                                    setter(scope, CurrDate());
                                });
                            }
                            else {
                                scope.$apply(function () {
                                    setter(scope, NewDate);
                                });
                            }

                            if (attrs.controlevents != undefined && attrs.controlevents != "") {
                                var callEveryMethod = attrs.controlevents.split(";")
                                callEveryMethod.forEach(function (v, k) {
                                    scope.$apply(function () {
                                        scope.$eval(v);
                                    });
                                });
                            }
                            return;
                        }

                        if (element[0].value.length != "") {

                            if (element[0].value.length == 2 || element[0].value.length == 1) {
                                var getDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

                                if (element[0].value > getDays) {
                                    NewDate = day + "/" + month + "/20" + element[0].value;
                                }
                                else {
                                    NewDate = element[0].value + "/" + month + "/" + date.getFullYear();
                                }
                            }
                            else if (element[0].value.length == 3) {
                                var Month = "";
                                var date1 = "";
                                if (element[0].value.indexOf("/") > -1) {
                                    date1 = element[0].value.split("/")[0];
                                    Month = element[0].value.split("/")[1];
                                }
                                else {
                                    date1 = element[0].value.substring(0, 1);
                                    Month = element[0].value.substring(1, 3);
                                }
                                NewDate = date1 + "/" + Month + "/" + date.getFullYear();
                            }
                            else if (element[0].value.length == 4) {
                                var Month = "";
                                var date1 = "";
                                if (element[0].value.indexOf("/") > -1) {
                                    date1 = element[0].value.split("/")[0];
                                    Month = element[0].value.split("/")[1];
                                }
                                else {
                                    date1 = element[0].value.substring(0, 2);
                                    Month = element[0].value.substring(2, 4);
                                }
                                NewDate = date1 + "/" + Month + "/" + date.getFullYear();
                                if (Month > 12) {
                                    date1 = element[0].value.substring(0, 1);
                                    Month = element[0].value.substring(1, 3);
                                    year = "200" + element[0].value.substring(3, 4);
                                    NewDate = date1 + "/" + Month + "/" + year;
                                }
                            }
                            else if (element[0].value.length == 5) {
                                var Month = "";
                                var date1 = "";
                                var year = "";
                                if (element[0].value.indexOf("/") > -1) {
                                    date1 = element[0].value.split("/")[0];
                                    Month = element[0].value.split("/")[1];
                                    year = date.getFullYear();
                                }
                                else {
                                    date1 = element[0].value.substring(0, 2);
                                    Month = element[0].value.substring(2, 4);
                                    year = "200" + element[0].value.substring(4, 5);
                                    if (Month > 12) {
                                        date1 = element[0].value.substring(0, 1);
                                        Month = element[0].value.substring(1, 3);
                                        year = "20" + element[0].value.substring(3, 5);
                                    }
                                }
                                NewDate = date1 + "/" + Month + "/" + year;
                            }
                            else if (element[0].value.length == 6) {
                                var Month = "";
                                var date1 = "";
                                var year = "";
                                if (element[0].value.indexOf("/") > -1) {
                                    date1 = element[0].value.split("/")[0];
                                    Month = element[0].value.split("/")[1];
                                    year = "20" + element[0].value.split("/")[2];
                                }
                                else {
                                    date1 = element[0].value.substring(0, 2);
                                    Month = element[0].value.substring(2, 4);
                                    year = "20" + element[0].value.substring(4, 6);
                                    if (Month > 12) {
                                        date1 = element[0].value.substring(0, 1);
                                        Month = element[0].value.substring(1, 2);
                                        year = element[0].value.substring(2, 6);
                                    }
                                }
                                NewDate = date1 + "/" + Month + "/" + year;
                            }
                            else if (element[0].value.length == 7) {
                                var Month = "";
                                var date1 = "";
                                var year = "";
                                if (element[0].value.indexOf("/") > -1) {
                                    date1 = element[0].value.split("/")[0];
                                    Month = element[0].value.split("/")[1];
                                    year = "200" + element[0].value.split("/")[2];
                                }
                                else {
                                    date1 = element[0].value.substring(0, 2);
                                    Month = element[0].value.substring(2, 3);
                                    year = element[0].value.substring(3, 7);
                                    if (Month > 12) {
                                        date1 = element[0].value.substring(0, 1);
                                        Month = element[0].value.substring(1, 3);
                                        year = element[0].value.substring(3, 7);
                                    }
                                }
                                NewDate = date1 + "/" + Month + "/" + year;
                            }
                            else if (element[0].value.length == 8) {
                                var Month = "";
                                var date1 = "";
                                var year = "";
                                if (element[0].value.indexOf("/") > -1) {
                                    date1 = element[0].value.split("/")[0];
                                    Month = element[0].value.split("/")[1];
                                    year = "20" + element[0].value.split("/")[2];
                                }
                                else {
                                    date1 = element[0].value.substring(0, 2);
                                    Month = element[0].value.substring(2, 4);
                                    year = element[0].value.substring(4, 8);
                                }
                                NewDate = date1 + "/" + Month + "/" + year;
                            }
                            else if (element[0].value.length == 9) {
                                var Month = "";
                                var date1 = "";
                                var year = "";
                                if (element[0].value.indexOf("/") > -1) {
                                    date1 = element[0].value.split("/")[0];
                                    Month = element[0].value.split("/")[1];
                                    year = "2" + element[0].value.split("/")[2];
                                }
                                NewDate = date1 + "/" + Month + "/" + year;
                            }
                            else {
                                scope.$apply(function () {
                                    setter(scope, CurrDate());
                                });
                                return;
                            }
                            if (isDate(NewDate)) {
                                var newDatePart = NewDate.split("/");
                                NewDate1 = newDatePart[1] + "/" + newDatePart[0] + "/" + newDatePart[2];
                                if (newDatePart[0].length < 2) newDatePart[0] = "0" + newDatePart[0];
                                if (newDatePart[1].length < 2) newDatePart[1] = "0" + newDatePart[1];
                                NewDate = newDatePart[0] + "/" + newDatePart[1] + "/" + newDatePart[2];
                                if (Date.parse(NewDate1) >= Date.parse(MaxDate) || Date.parse(NewDate1) <= Date.parse(MinDate)) {
                                    scope.$apply(function () {
                                        setter(scope, CurrDate());
                                    });
                                }
                                else {
                                    scope.$apply(function () {
                                        setter(scope, NewDate);
                                    });
                                }
                            }
                            else {
                                scope.$apply(function () {
                                    setter(scope, CurrDate());
                                });
                            }
                        }

                        if (attrs.controlevents != undefined && attrs.controlevents != "") {
                            var callEveryMethod = attrs.controlevents.split(";")
                            callEveryMethod.forEach(function (v, k) {
                                scope.$apply(function () {
                                    scope.$eval(v);
                                });
                            });
                        }
                    }
                    else {
                        if (attrs.controlevents != undefined && attrs.controlevents != "") {
                            var callEveryMethod = attrs.controlevents.split(";")
                            callEveryMethod.forEach(function (v, k) {
                                scope.$apply(function () {
                                    scope.$eval(v);
                                });
                            });
                        }
                    }
                });
            });
            scope.$on('$destroy', function () {
                element.remove();
            });
        }
    };
}]);

app.directive('dateformat', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, modelCtrl) {
            modelCtrl.$parsers.push(function (inputValue) {
                // this next if is necessary for when using ng-required on your input. 
                // In such cases, when a letter is typed first, this parser will be called
                // again, and the 2nd time, the value will be undefined
                if (inputValue == undefined) return ''
                var transformedInput = inputValue.replace(/[^0-9/]/g, '');
                if (transformedInput != inputValue) {
                    modelCtrl.$setViewValue(transformedInput);
                    modelCtrl.$render();
                }

                return transformedInput;
            });
        }
    };
});

app.directive('jqdatepickerformater', ['$filter', '$window', '$parse', '$timeout', function ($filter, $window, $parse, $timeout) {
    return {
        require: '?ngModel',
        restrict: 'A',
        compile: function () {
            var moment = $window.moment;
            var getter, setter;
            return function (scope, element, attrs, ngModel) {

                getter = $parse(attrs.ngModel);
                setter = getter.assign;

                ngModel.$formatters.unshift(function (modelValue) {
                    if (!modelValue) return "";
                    var retVal = modelValue;
                    setter(scope, retVal);
                    return retVal;
                });

                // If the ngModel directive is used, then set the initial value and keep it in sync
                if (ngModel) {
                    element.on('blur', function (event) {
                        if (ngModel.$modelValue !== undefined && ngModel.$modelValue !== null && ngModel.$modelValue.length > 0) {
                            var NewDate = "";
                            var date = new Date();
                            if (isDate(ngModel.$modelValue)) {

                                var Month = ngModel.$modelValue.split("/")[0];
                                var date1 = ngModel.$modelValue.split("/")[1];
                                var dtYear = ngModel.$modelValue.split("/")[2];

                                if (dtYear.length == "") { dtYear = date.getFullYear(); }
                                if (dtYear.length == 1) { dtYear = "200" + dtYear; }
                                else if (dtYear.length == 2) { dtYear = "20" + dtYear; }
                                else if (dtYear.length == 3) { dtYear = "2" + dtYear; }

                                NewDate = Month + "/" + date1 + "/" + dtYear;
                                scope.$apply(function () {
                                    setter(scope, NewDate);
                                });
                                return;
                            }

                            if (ngModel.$modelValue.length > 0) {

                                if (ngModel.$modelValue.length == 2 || ngModel.$modelValue.length == 1) {
                                    var getDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

                                    if (ngModel.$modelValue > getDays) {
                                        NewDate = (date.getMonth() + 1) + "/" + date.getDate() + "/20" + ngModel.$modelValue;
                                    }
                                    else {
                                        NewDate = (date.getMonth() + 1) + "/" + ngModel.$modelValue + "/" + date.getFullYear();
                                    }
                                }
                                else if (ngModel.$modelValue.length == 3) {
                                    var Month = "";
                                    var date1 = "";
                                    if (ngModel.$modelValue.indexOf("/") > -1) {
                                        Month = ngModel.$modelValue.split("/")[0];
                                        date1 = ngModel.$modelValue.split("/")[1];
                                    }
                                    else {
                                        Month = ngModel.$modelValue.substring(0, 1);
                                        date1 = ngModel.$modelValue.substring(1, 3);
                                    }
                                    NewDate = Month + "/" + date1 + "/" + date.getFullYear();
                                }
                                else if (ngModel.$modelValue.length == 4) {
                                    var Month = "";
                                    var date1 = "";
                                    if (ngModel.$modelValue.indexOf("/") > -1) {
                                        Month = ngModel.$modelValue.split("/")[0];
                                        date1 = ngModel.$modelValue.split("/")[1];
                                    }
                                    else {
                                        Month = ngModel.$modelValue.substring(0, 2);
                                        date1 = ngModel.$modelValue.substring(2, 4);
                                        NewDate = Month + "/" + date1 + "/" + date.getFullYear();
                                        if (Month > 12) {
                                            Month = ngModel.$modelValue.substring(0, 1);
                                            date1 = ngModel.$modelValue.substring(1, 3);
                                            year = "200" + ngModel.$modelValue.substring(3, 4);
                                            NewDate = Month + "/" + date1 + "/" + year;
                                        }
                                    }
                                }
                                else if (ngModel.$modelValue.length == 5) {
                                    var Month = "";
                                    var date1 = "";
                                    var year = "";
                                    if (ngModel.$modelValue.indexOf("/") > -1) {
                                        Month = ngModel.$modelValue.split("/")[0];
                                        date1 = ngModel.$modelValue.split("/")[1];
                                        year = date.getFullYear();
                                    }
                                    else {
                                        Month = ngModel.$modelValue.substring(0, 2);
                                        date1 = ngModel.$modelValue.substring(2, 4);
                                        year = "200" + ngModel.$modelValue.substring(4, 5);
                                        if (Month > 12) {
                                            Month = ngModel.$modelValue.substring(0, 1);
                                            date1 = ngModel.$modelValue.substring(1, 3);
                                            year = "20" + ngModel.$modelValue.substring(3, 5);
                                        }

                                    }
                                    NewDate = Month + "/" + date1 + "/" + year;
                                }
                                else if (ngModel.$modelValue.length == 6) {
                                    var Month = "";
                                    var date1 = "";
                                    var year = "";
                                    if (ngModel.$modelValue.indexOf("/") > -1) {
                                        Month = ngModel.$modelValue.split("/")[0];
                                        date1 = ngModel.$modelValue.split("/")[1];
                                        year = "20" + ngModel.$modelValue.split("/")[2];
                                    }
                                    else {
                                        Month = ngModel.$modelValue.substring(0, 2);
                                        date1 = ngModel.$modelValue.substring(2, 4);
                                        year = "20" + ngModel.$modelValue.substring(4, 6);
                                        if (Month > 12) {
                                            Month = ngModel.$modelValue.substring(0, 1);
                                            date1 = ngModel.$modelValue.substring(1, 2);
                                            year = ngModel.$modelValue.substring(2, 6);
                                        }
                                    }
                                    NewDate = Month + "/" + date1 + "/" + year;

                                }
                                else if (ngModel.$modelValue.length == 7) {
                                    var Month = "";
                                    var date1 = "";
                                    var year = "";
                                    if (ngModel.$modelValue.indexOf("/") > -1) {
                                        Month = ngModel.$modelValue.split("/")[0];
                                        date1 = ngModel.$modelValue.split("/")[1];
                                        year = "200" + ngModel.$modelValue.split("/")[2];
                                    }
                                    else {
                                        Month = ngModel.$modelValue.substring(0, 2);
                                        date1 = ngModel.$modelValue.substring(2, 3);
                                        year = ngModel.$modelValue.substring(3, 7);
                                        if (Month > 12) {
                                            Month = ngModel.$modelValue.substring(0, 1);
                                            date1 = ngModel.$modelValue.substring(1, 3);
                                            year = ngModel.$modelValue.substring(3, 7);
                                        }
                                    }
                                    NewDate = Month + "/" + date1 + "/" + year;
                                }
                                else if (ngModel.$modelValue.length == 8) {
                                    var Month = "";
                                    var date1 = "";
                                    var year = "";
                                    if (ngModel.$modelValue.indexOf("/") > -1) {
                                        Month = ngModel.$modelValue.split("/")[0];
                                        date1 = ngModel.$modelValue.split("/")[1];
                                        year = "20" + ngModel.$modelValue.split("/")[2];
                                    }
                                    else {
                                        Month = ngModel.$modelValue.substring(0, 2);
                                        date1 = ngModel.$modelValue.substring(2, 4);
                                        year = ngModel.$modelValue.substring(4, 8);
                                    }
                                    NewDate = Month + "/" + date1 + "/" + year;
                                }
                                else if (ngModel.$modelValue.length == 9) {
                                    var Month = "";
                                    var date1 = "";
                                    var year = "";
                                    if (ngModel.$modelValue.indexOf("/") > -1) {
                                        Month = ngModel.$modelValue.split("/")[0];
                                        date1 = ngModel.$modelValue.split("/")[1];
                                        year = "2" + ngModel.$modelValue.split("/")[2];
                                    }
                                    NewDate = Month + "/" + date1 + "/" + year;
                                }
                                else {
                                    scope.$apply(function () {
                                        setter(scope, CurrDate);
                                    });
                                    return;
                                }
                                if (isDate(NewDate)) {
                                    scope.$apply(function () {
                                        setter(scope, NewDate);
                                    });
                                }
                                else {
                                    scope.$apply(function () {
                                        setter(scope, CurrDate);
                                    });
                                }
                            }
                        }
                    });
                    element.on('mousewheel', function (event) {
                        element.blur();
                        return false;
                    });
                }
            };
        }
    };
}]);

function isDate(txtDate) {
    var date = new Date();
    var currVal = txtDate;
    if (currVal == '')
        return false;

    var rxDatePattern = /^(\d{1,2})(\/|-)(\d{1,2})(\/|-)(\d{0,4})$/; //Declare Regex
    var dtArray = currVal.match(rxDatePattern); // is format OK?

    if (dtArray == null)
        return false;
    //Checks for dd/mm/yyyy format.
    var dtDay = dtArray[1];
    var dtMonth = dtArray[3];
    var dtYear = dtArray[5];
    if (dtYear.length == "") { dtYear = date.getFullYear(); }
    if (dtYear.length == 1) { dtYear = "200" + dtYear; }
    else if (dtYear.length == 2) { dtYear = "20" + dtYear; }
    else if (dtYear.length == 3) { dtYear = "2" + dtYear; }

    if (dtMonth < 1 || dtMonth > 12)
        return false;
    else if (dtDay < 1 || dtDay > 31)
        return false;
    else if ((dtMonth == 4 || dtMonth == 6 || dtMonth == 9 || dtMonth == 11) && dtDay == 31)
        return false;
    else if (dtMonth == 2) {
        var isleap = (dtYear % 4 == 0 && (dtYear % 100 != 0 || dtYear % 400 == 0));
        if (dtDay > 29 || (dtDay == 29 && !isleap))
            return false;
    }
    return true;
}

function CurrDate() {
    var date = new Date();
    var day = ("0" + date.getDate()).slice(-2);
    var month = ("0" + (date.getMonth() + 1)).slice(-2)
    return day + '/' + month + '/' + date.getFullYear();
}

app.directive('faxFormat', ['$filter', '$window', '$parse', '$timeout', function ($filter, $window, $parse, $timeout) {
    return {
        require: '?ngModel',
        restrict: 'A',
        compile: function () {
            var moment = $window.moment;
            var getter, setter;
            return function (scope, element, attrs, ngModel) {

                ngModel.$parsers.push(function (inputValue) {
                    // this next if is necessary for when using ng-required on your input. 
                    // In such cases, when a letter is typed first, this parser will be called
                    // again, and the 2nd time, the value will be undefined
                    if (inputValue == undefined)
                        return ''
                    var transformedInput = inputValue.replace(/[^0-9-]*$/g, '');
                    if (transformedInput != inputValue) {
                        ngModel.$setViewValue(transformedInput);
                        ngModel.$render();
                    }

                    return transformedInput;
                });



                getter = $parse(attrs.ngModel);
                setter = getter.assign;
                ngModel.$formatters.unshift(function (modelValue) {
                    if (!modelValue) return "";
                    var retVal = modelValue;
                    setter(scope, retVal);
                    return retVal;
                });
                // If the ngModel directive is used, then set the initial value and keep it in sync
                if (ngModel) {

                    element.on('blur', function (event) {
                        if (ngModel.$modelValue != "" && ngModel.$modelValue != undefined) {
                            if (ngModel.$modelValue.indexOf("-") > 0) {
                                scope.$apply(function () {
                                    setter(scope, ngModel.$modelValue);
                                });

                            }
                            else {

                                if (ngModel.$modelValue.length >= 10) {
                                    var newValue = ngModel.$modelValue.slice(0, 3) + '-' + ngModel.$modelValue.slice(3, 6) + '-' + ngModel.$modelValue.slice(6, 10);
                                    scope.$apply(function () {
                                        setter(scope, newValue);
                                    });
                                }
                            }
                        }

                    });
                }
            };
        }
    };
}]);

app.directive('convertblanktozero', ['$filter', '$window', '$parse', '$timeout', function ($filter, $window, $parse, $timeout) {
    return {
        require: '?ngModel',
        restrict: 'A',
        compile: function () {
            var moment = $window.moment;
            var getter, setter;
            return function (scope, element, attrs, ngModel) {


                ngModel.$parsers.push(function (inputValue) {
                    // this next if is necessary for when using ng-required on your input. 
                    // In such cases, when a letter is typed first, this parser will be called
                    // again, and the 2nd time, the value will be undefined
                    if (inputValue == undefined)
                        return ''
                    var transformedInput = inputValue.replace(/[^0-9]/g, '');
                    if (transformedInput != inputValue) {
                        ngModel.$setViewValue(transformedInput);
                        ngModel.$render();
                    }

                    return transformedInput;
                });

                getter = $parse(attrs.ngModel);
                setter = getter.assign;

                ngModel.$formatters.unshift(function (modelValue) {
                    if (!modelValue) return "";
                    var retVal = modelValue;
                    setter(scope, retVal);
                    return retVal;
                });

                // If the ngModel directive is used, then set the initial value and keep it in sync
                if (ngModel) {
                    element.on('blur', function (event) {
                        if (ngModel.$modelValue == undefined || ngModel.$modelValue == null || ngModel.$modelValue == "" || ngModel.$modelValue == "0" || ngModel.$modelValue == "00" || ngModel.$modelValue == "000") {
                            var NewValue = "0";
                            scope.$apply(function () {
                                setter(scope, NewValue);
                            });
                        }
                        else {
                            scope.$apply(function () {
                                setter(scope, ngModel.$modelValue.replace(/^0+/, ''));
                            });
                        }
                    });
                }


            };
        }
    };
}]);

app.directive('capitalize', ['$window', function ($window) {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, modelCtrl) {
            var capitalize = function (inputValue) {
                var GetCurserPosition = element[0].selectionStart;
                if (inputValue == undefined) inputValue = '';
                var capitalized = inputValue.toUpperCase();
                if (capitalized !== inputValue) {
                    modelCtrl.$setViewValue(capitalized);
                    modelCtrl.$render();
                }

                if (inputValue != undefined && inputValue != '') {
                    setSelectionRange(element[0], GetCurserPosition, GetCurserPosition);
                }

                return capitalized;
            }
            modelCtrl.$parsers.push(capitalize);
            capitalize(scope[attrs.ngModel]); // capitalize initial value    

            scope.$on('$destroy', function () {
                element.remove();
            });
        }
    };
}]);

function setSelectionRange(input, selectionStart, selectionEnd) {
    if (input.setSelectionRange) {
        input.setSelectionRange(selectionStart, selectionEnd);
    }
    else if (input.createTextRange) {
        var range = input.createTextRange();
        range.collapse(true);
        range.moveEnd('character', selectionEnd);
        range.moveStart('character', selectionStart);
        range.select();
    }
}

app.directive('ngBlur', ['$parse', function ($parse) {
    return function (scope, element, attr) {
        element.bind("blur", function (event) {
            scope.$apply(function () {
                scope.$eval(attr.myBlur);
            });
            if (this.tabIndex != 0) {
                var $next = $('[tabIndex=' + (+this.tabIndex + 1) + ']');
                if (!$next.length) {
                    $next = $('[tabIndex=1]');
                }
                $next.focus();
            }
        });
    }
}]);

app.filter("date", [function () {
    var result = function (date, formatstring) {
        if (formatstring != null && formatstring != undefined) {
            formatstring = formatstring.toUpperCase();
            formatstring = formatstring.replace("HH:MM:SS".toUpperCase(), "HH:mm:ss");
            formatstring = formatstring.replace("HH:MM", "HH:mm");
            if (date != null && date != undefined && formatstring.length > 5) {
                if (date != null && date.length > 16) {
                    date = date.substring(0, 16);
                    var finaldate = moment(date).format(formatstring);
                    if (finaldate === 'Invalid date') {
                        return date;
                    }
                    else {
                        return finaldate;
                    }
                }
                var finaldate = moment(date).format(formatstring);
                if (finaldate === 'Invalid date') {
                    return date;
                }
                else {
                    return finaldate;
                }
            }
            if (date != null && date != undefined && (formatstring.length == 5 && date.length > 5)) {
                if (date != null && date.length > 16) {
                    date = date.substring(0, 16);
                }

                var finaldate = moment(date).format(formatstring);
                if (finaldate === 'Invalid date') {
                    return date;
                }
                else {
                    return finaldate;
                }

            }
            else
                return date;

        }
        else
            return date;

    }
    return result;
}]);

app.directive('ngNumericValidation', function () {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function ($scope, $element, $attrs, ngModel) {

            ngModel.$validators.numericvalidation = function (modelValue) {
                //true or false based on custome dir validation
                if (modelValue == null || modelValue == undefined || modelValue == "" || modelValue == "0") {
                    return false;
                }
                else {
                    return true;
                }
            };
        }
    };
});

app.directive('selectOnClick', ['$window', function ($window) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.on('click', function () {
                if (!$window.getSelection().toString()) {
                    // Required for mobile Safari
                    this.setSelectionRange(0, this.value.length)
                }
            });
        }
    };
}]);

app.factory('OpenMsgBox', ['ngDialog', function (ngDialog) {
    return {
        ReferMsg: function (HeaderText, DisplayMessage, height) {
            if (height == undefined)
                height = 50;
            return ngDialog.openConfirm({
                template:
                    '<p class="popupheadingmainheader margin-top-neg-5">' +
                        '<span class="pull-left">' +
                            '<strong class="font12">' + HeaderText + '</strong>' +
                        '</span>' +
                     '</p>' +
                     '<div class="panel-body margin-top-30">' +
                        '<div class="content">' +
                            '<div class="col-sm-12 col-xs-12 col-lg-12 paddingleftright0 margin_b10">' +
                                '<div class="well-sm graybg form-horizontal" style="height:"' + height + 'px;">' +
                                    DisplayMessage +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group  margin-right-10">' +
                                '<span class="pull-right">' +
                                    '<button class="btn btn-primary" id="btnOk" ng-click="confirm(1)">OK</button>' +
                                '</span>' +
                             '</div>' +
                      '</div>',
                plain: true
            });

        }
    };
}]);

app.directive('compile', ['$compile', function ($compile) {
    return function (scope, element, attrs) {
        scope.$watch(
          function (scope) {
              // watch the 'compile' expression for changes
              return scope.$eval(attrs.compile);
          },
          function (value) {

              if (value != undefined) {
                  var ErrorMsg = '';
                  var errorArray = value.split("\n");
                  var length = errorArray.length;
                  if (errorArray != undefined && errorArray.length) {
                      for (var i = 0; i < errorArray.length; i++) {
                          var strError = errorArray[i];
                          if (!strError.match('\u25CF')) {
                              strError = '\u25CF' + '&nbsp;&nbsp;' + strError;
                          }
                          if (length != i) {
                              ErrorMsg += strError + '\n';
                          }
                      }
                      value = ErrorMsg;

                  }

              }

              // when the 'compile' expression changes
              // assign it into the current DOM
              element.html(value);

              // compile the new DOM and link it to the current
              // scope.
              // NOTE: we only compile .childNodes so that
              // we don't get into infinite loop compiling ourselves
              $compile(element.contents())(scope);
          }
      );
    };
}]);

app.factory('ConfirmMsgBox', ['ngDialog', function (ngDialog) {
    return {
        ReferMsg: function (HeaderText, DisplayMessage, height) {
            if (height == undefined)
                height = 50;
            return ngDialog.openConfirm({
                id: "ngDialogConfimBox",
                template:
                    '<div><p class="popupheadingmainheader">' +
                        '<span class="pull-left">' +
                            '<strong class="font12">' + HeaderText + '</strong>' +
                        '</span>' +
                     '</p>' +
                     '<div class="panel-body">' +
                        '<div class="content">' +
                            '<div class="col-sm-12 col-xs-12 col-lg-12 paddingleftright0 margin_b10">' +
                                '<div class="well-sm graybg form-horizontal" style="height:"' + height + 'px;">' +
                                    DisplayMessage +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group  margin-right-10">' +
                                '<span class="pull-right">' +
                                    '<button class="btn btn-primary" id="btnOk" ng-click="confirm(1)">Yes</button>&nbsp' +
                                    '<button class="btn btn-primary" id="btnNo" ng-click="confirm(2)">No</button>' +
                                '</span>' +
                             '</div>' +
                      '</div></div>',
                plain: true
            });

        }
    };
}]);

var compareTo = function () {
    return {
        require: "ngModel",
        scope: {
            otherModelValue: "=compareTo"
        },
        link: function (scope, element, attributes, ngModel) {

            ngModel.$validators.compareTo = function (modelValue) {
                return modelValue == scope.otherModelValue;
            };

            scope.$watch("otherModelValue", function () {
                ngModel.$validate();
            });
        }
    };
};

app.directive("compareTo", compareTo);

//Password minimum 1 Capital,1 Digit,1 special charactor. min length : 6 and max length :20
app.directive('validPassword', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, control) {
            control.$parsers.push(function (viewValue) {
                var newPassword = control.$viewValue;
                control.$setValidity("invalidPassword", true);
                if (typeof newPassword === "object" || newPassword == "") return newPassword;  // pass through if we clicked date from popup
                if (!newPassword.match(/^(?=.*\d)(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,20}$/))
                    control.$setValidity("invalidPassword", false);
                return viewValue;
            });
        }
    };
});


angular.module("ui.bootstrap.typeahead", ['ui.bootstrap.position', 'ui.bootstrap.bindHtml'])

/**
 * A helper service that can parse typeahead's syntax (string provided by users)
 * Extracted to a separate service for ease of unit testing
 */
  .factory('typeaheadParser', ['$parse', function ($parse) {

      //                      00000111000000000000022200000000000000003333333333333330000000000044000
      var TYPEAHEAD_REGEXP = /^\s*(.*?)(?:\s+as\s+(.*?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+(.*)$/;

      return {
          parse: function (input) {

              var match = input.match(TYPEAHEAD_REGEXP), modelMapper, viewMapper, source;
              if (!match) {
                  throw new Error(
                    "Expected typeahead specification in form of '_modelValue_ (as _label_)? for _item_ in _collection_'" +
                      " but got '" + input + "'.");
              }

              return {
                  itemName: match[3],
                  source: $parse(match[4]),
                  viewMapper: $parse(match[2] || match[1]),
                  modelMapper: $parse(match[1])
              };
          }
      };
  }])

  .directive('typeahead', ['$compile', '$parse', '$q', '$timeout', '$document', '$position', 'typeaheadParser',
    function ($compile, $parse, $q, $timeout, $document, $position, typeaheadParser) {

        var HOT_KEYS = [9, 13, 27, 38, 40];

        return {
            require: 'ngModel',
            link: function (originalScope, element, attrs, modelCtrl) {

                //SUPPORTED ATTRIBUTES (OPTIONS)

                //minimal no of characters that needs to be entered before typeahead kicks-in
                var minSearch = originalScope.$eval(attrs.typeaheadMinLength) || 1;

                //minimal wait time after last character typed before typehead kicks-in
                var waitTime = originalScope.$eval(attrs.typeaheadWaitMs) || 0;

                //should it restrict model values to the ones selected from the popup only?
                var isEditable = originalScope.$eval(attrs.typeaheadEditable) !== false;

                //binding to a variable that indicates if matches are being retrieved asynchronously
                var isLoadingSetter = $parse(attrs.typeaheadLoading).assign || angular.noop;

                //a callback executed when a match is selected
                var onSelectCallback = $parse(attrs.typeaheadOnSelect);

                var inputFormatter = attrs.typeaheadInputFormatter ? $parse(attrs.typeaheadInputFormatter) : undefined;

                var appendToBody = attrs.typeaheadAppendToBody ? $parse(attrs.typeaheadAppendToBody) : false;

                //INTERNAL VARIABLES

                //model setter executed upon match selection
                var $setModelValue = $parse(attrs.ngModel).assign;

                //expressions used by typeahead
                var parserResult = typeaheadParser.parse(attrs.typeahead);

                var hasFocus;

                //pop-up element used to display matches
                var popUpEl = angular.element('<div typeahead-popup></div>');
                popUpEl.attr({
                    matches: 'matches',
                    active: 'activeIdx',
                    select: 'select(activeIdx)',
                    query: 'query',
                    position: 'position'
                });
                //custom item template
                if (angular.isDefined(attrs.typeaheadTemplateUrl)) {
                    popUpEl.attr('template-url', attrs.typeaheadTemplateUrl);
                }

                //create a child scope for the typeahead directive so we are not polluting original scope
                //with typeahead-specific data (matches, query etc.)
                var scope = originalScope.$new();
                originalScope.$on('$destroy', function () {
                    scope.$destroy();
                });

                var resetMatches = function () {
                    scope.matches = [];
                    scope.activeIdx = -1;
                };

                var getMatchesAsync = function (inputValue) {

                    var locals = { $viewValue: inputValue };
                    isLoadingSetter(originalScope, true);
                    $q.when(parserResult.source(originalScope, locals)).then(function (matches) {

                        //it might happen that several async queries were in progress if a user were typing fast
                        //but we are interested only in responses that correspond to the current view value
                        if (inputValue === modelCtrl.$viewValue && hasFocus) {
                            if (matches.length > 0) {

                                scope.activeIdx = -1;
                                scope.matches.length = 0;

                                //transform labels
                                for (var i = 0; i < matches.length; i++) {
                                    locals[parserResult.itemName] = matches[i];
                                    scope.matches.push({
                                        label: parserResult.viewMapper(scope, locals),
                                        model: matches[i]
                                    });
                                }

                                scope.query = inputValue;
                                //position pop-up with matches - we need to re-calculate its position each time we are opening a window
                                //with matches as a pop-up might be absolute-positioned and position of an input might have changed on a page
                                //due to other elements being rendered
                                scope.position = appendToBody ? $position.offset(element) : $position.position(element);
                                scope.position.top = scope.position.top + element.prop('offsetHeight');

                            } else {
                                resetMatches();
                            }
                            isLoadingSetter(originalScope, false);
                        }
                    }, function () {
                        resetMatches();
                        isLoadingSetter(originalScope, false);
                    });
                };

                resetMatches();

                //we need to propagate user's query so we can higlight matches
                scope.query = undefined;

                //Declare the timeout promise var outside the function scope so that stacked calls can be cancelled later 
                var timeoutPromise;

                //plug into $parsers pipeline to open a typeahead on view changes initiated from DOM
                //$parsers kick-in on all the changes coming from the view as well as manually triggered by $setViewValue
                modelCtrl.$parsers.unshift(function (inputValue) {

                    hasFocus = true;

                    if (inputValue && inputValue.length >= minSearch) {
                        if (waitTime > 0) {
                            if (timeoutPromise) {
                                $timeout.cancel(timeoutPromise);//cancel previous timeout
                            }
                            timeoutPromise = $timeout(function () {
                                getMatchesAsync(inputValue);
                            }, waitTime);
                        } else {
                            getMatchesAsync(inputValue);
                        }
                    } else {
                        isLoadingSetter(originalScope, false);
                        resetMatches();
                    }

                    if (isEditable) {
                        return inputValue;
                    } else {
                        if (!inputValue) {
                            // Reset in case user had typed something previously.
                            modelCtrl.$setValidity('editable', true);
                            return inputValue;
                        } else {
                            modelCtrl.$setValidity('editable', false);
                            return undefined;
                        }
                    }
                });

                modelCtrl.$formatters.push(function (modelValue) {

                    var candidateViewValue, emptyViewValue;
                    var locals = {};

                    if (inputFormatter) {

                        locals['$model'] = modelValue;
                        return inputFormatter(originalScope, locals);

                    } else {

                        //it might happen that we don't have enough info to properly render input value
                        //we need to check for this situation and simply return model value if we can't apply custom formatting
                        locals[parserResult.itemName] = modelValue;
                        candidateViewValue = parserResult.viewMapper(originalScope, locals);
                        locals[parserResult.itemName] = undefined;
                        emptyViewValue = parserResult.viewMapper(originalScope, locals);

                        return candidateViewValue !== emptyViewValue ? candidateViewValue : modelValue;
                    }
                });

                scope.select = function (activeIdx) {
                    //called from within the $digest() cycle
                    var locals = {};
                    var model, item;

                    if (scope.matches[activeIdx] != undefined) {
                        locals[parserResult.itemName] = item = scope.matches[activeIdx].model;
                        model = parserResult.modelMapper(originalScope, locals);
                        $setModelValue(originalScope, model);
                        modelCtrl.$setValidity('editable', true);

                        onSelectCallback(originalScope, {
                            $item: item,
                            $model: model,
                            $label: parserResult.viewMapper(originalScope, locals)
                        });
                        resetMatches();

                        //return focus to the input element if a mach was selected via a mouse click event
                        element[0].focus();
                    }

                };

                //bind keyboard events: arrows up(38) / down(40), enter(13) and tab(9), esc(27)
                element.bind('keydown', function (evt) {

                    //typeahead is open and an "interesting" key was pressed
                    if (scope.matches.length === 0 || HOT_KEYS.indexOf(evt.which) === -1) {
                        return;
                    }

                    if (evt.which === 9 && scope.activeIdx === -1) {
                        resetMatches();
                        return;
                    }

                    evt.preventDefault();

                    if (evt.which === 40) {
                        scope.activeIdx = (scope.activeIdx + 1) % scope.matches.length;
                        scope.$digest();

                    } else if (evt.which === 38) {
                        scope.activeIdx = (scope.activeIdx ? scope.activeIdx : scope.matches.length) - 1;
                        scope.$digest();

                    } else if (evt.which === 13 || evt.which === 9) {
                        scope.$apply(function () {
                            scope.select(scope.activeIdx);
                        });

                    } else if (evt.which === 27) {
                        evt.stopPropagation();

                        resetMatches();
                        scope.$digest();
                    }
                });

                element.bind('blur', function (evt) {
                    hasFocus = false;
                });

                // Keep reference to click handler to unbind it.
                var dismissClickHandler = function (evt) {
                    if (element[0] !== evt.target) {
                        resetMatches();
                        scope.$digest();
                    }
                };

                $document.bind('click', dismissClickHandler);

                originalScope.$on('$destroy', function () {
                    $document.unbind('click', dismissClickHandler);
                });

                var $popup = $compile(popUpEl)(scope);
                if (appendToBody) {
                    $document.find('body').append($popup);
                } else {
                    element.after($popup);
                }
            }
        };

    }])

  .directive('typeaheadPopup', function () {
      return {
          restrict: 'EA',
          scope: {
              matches: '=',
              query: '=',
              active: '=',
              position: '=',
              select: '&'
          },
          replace: true,
          templateUrl: 'template/typeahead/typeahead-popup.html',
          link: function (scope, element, attrs) {

              scope.templateUrl = attrs.templateUrl;

              scope.isOpen = function () {
                  return scope.matches.length > 0;
              };

              scope.isActive = function (matchIdx) {
                  return scope.active == matchIdx;
              };

              scope.selectActive = function (matchIdx) {
                  scope.active = matchIdx;
              };

              scope.selectMatch = function (activeIdx) {
                  scope.select({ activeIdx: activeIdx });
              };
          }
      };
  })

  .directive('typeaheadMatch', ['$http', '$templateCache', '$compile', '$parse', function ($http, $templateCache, $compile, $parse) {
      return {
          restrict: 'EA',
          scope: {
              index: '=',
              match: '=',
              query: '='
          },
          link: function (scope, element, attrs) {
              var tplUrl = $parse(attrs.templateUrl)(scope.$parent) || 'template/typeahead/typeahead-match.html';
              $http.get(tplUrl, { cache: $templateCache }).success(function (tplContent) {
                  element.replaceWith($compile(tplContent.trim())(scope));
                  element[0].focus();
              });
          }
      };
  }])

  .directive('shouldFocus', function () {
      return {
          restrict: 'A',
          link: function (scope, element, attrs) {
              scope.$watch(attrs.shouldFocus, function (newVal, oldVal) {
                  element[0].scrollIntoView(false);
              });
          }
      };
  })

  .filter('typeaheadHighlight', function () {

      function escapeRegexp(queryToEscape) {
          return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
      }

      return function (matchItem, query) {
          return query ? matchItem.replace(new RegExp(escapeRegexp(query), 'gi'), '<strong>$&</strong>') : matchItem;
      };
  });


angular.module("template/typeahead/typeahead-match.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/typeahead/typeahead-match.html",
      "<a tabindex=\"-1\" bind-html-unsafe=\"match.label | typeaheadHighlight:query\"></a>");
}]);

angular.module("template/typeahead/typeahead-popup.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/typeahead/typeahead-popup.html",
      "<ul class=\"dropdown-menu widthf\" ng-style=\"{display: isOpen()&&'block' || 'none', top: position.top+'px', left: position.left+'px'}\">\n" +
      "    <li ng-repeat=\"match in matches\" should-focus=\"isActive($index)\" ng-class=\"{active: isActive($index) }\" ng-mouseenter=\"selectActive($index)\" ng-click=\"selectMatch($index)\">\n" +
      "        <div typeahead-match index=\"$index\" match=\"match\" query=\"query\" template-url=\"templateUrl\"></div>\n" +
      "    </li>\n" +
      "</ul>");
}]);

app.directive('alphanumericexcludesomespecial', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, modelCtrl) {
            modelCtrl.$parsers.push(function (inputValue) {
                if (inputValue == undefined) return ''
                //var transformedInput = inputValue.replace(/[^0-9A-Za-z-._' ']/g, '');
                var transformedInput = inputValue.replace(/[<>&#"']/g, '')
                if (transformedInput != inputValue) {
                    modelCtrl.$setViewValue(transformedInput);
                    modelCtrl.$render();
                }

                return transformedInput;
            });
        }
    };
});

app.directive('alphanumericonly', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, modelCtrl) {
            modelCtrl.$parsers.push(function (inputValue) {
                if (inputValue == undefined) return ''
                var transformedInput = inputValue.replace(/[^0-9A-Za-z' ']/g, '');
                if (transformedInput != inputValue) {
                    modelCtrl.$setViewValue(transformedInput);
                    modelCtrl.$render();
                }

                return transformedInput;
            });
        }
    };
});

app.filter('trustUrl', function ($sce) {
    return function (url) {
        return $sce.trustAsResourceUrl(url);
    };
});

app.directive('numbersWithdecimalonly', ['$filter', '$locale', function ($filter, $locale) {
    return {
        require: '?ngModel',
        scope: {
            precision: '=precision',
            maximumlength: '=maximumlength',
            indexvalue: '=indexvalue',
            allownegative: '=allownegative'
        },
        link: function (scope, element, attrs, ngModelCtrl) {
            if (!ngModelCtrl) {
                return;
            }

            ngModelCtrl.$parsers.push(function (val) {
                var cval = SetdecimalValue(val);
                return cval;
            });

            function SetdecimalValue(val) {
                var clean = '';
                if (scope.allownegative == true) {
                    clean = val.replace(/[^-?0-9\.]+/g, '');
                }
                else {
                    clean = val.replace(/[^0-9\.]+/g, '');
                }

                if (val !== clean || val.indexOf('.') != val.lastIndexOf('.')) {
                    if (val.indexOf('.') != val.lastIndexOf('.')) {
                        clean = clean.substring(0, clean.length - 1);
                    }
                }

                if (clean.indexOf('.') != -1) {
                    if (clean.length > (clean.indexOf('.') + (scope.precision + 1))) {
                        clean = clean.substring(0, clean.length - 1);
                    }
                }

                if (clean != undefined && clean.indexOf('.') >= 0) {
                    scope.dynamicMaxlength = scope.maximumlength;
                }
                else {
                    scope.dynamicMaxlength = (scope.maximumlength - (scope.precision + 1));
                }

                if (scope.dynamicMaxlength != undefined && clean.length > scope.dynamicMaxlength && val.indexOf('.') < 0) {
                    clean = clean.substring(0, scope.dynamicMaxlength);
                }

                if (clean == '') {
                    clean = Number("0").toFixed(scope.precision);
                }

                if (clean.lastIndexOf('-') > 0) {
                    clean = clean.slice(0, -1);
                }

                ngModelCtrl.$setViewValue(clean);
                ngModelCtrl.$render();
                return clean;
            }

            ngModelCtrl.$formatters.unshift(function (value) {
                if (value != undefined && value != "" && !isNaN(value)) {
                    var val = parseFloat(value);
                    return val.toFixed(scope.precision != undefined ? scope.precision : 2);
                }
                else {
                    return value;
                }
            });

            element.on("keydown", function (event) {
                if (event.keyCode === 32) {
                    event.preventDefault();
                }
                if (scope.dynamicMaxlength != undefined) {
                    var value = SetdecimalValue(element[0].value);
                    if ((event.keyCode == 110 || event.keyCode == 190) && (value.length >= scope.dynamicMaxlength)) {
                        scope.dynamicMaxlength = scope.maximumlength;
                        if (value.length >= scope.dynamicMaxlength) {
                            if (!(element[0].value.length == element[0].selectionEnd && element[0].selectionStart == 0) && element[0].selectionStart == element[0].selectionEnd) {
                                event.preventDefault();
                            }
                        }
                    }
                    else if (((event.keyCode >= 48 && event.keyCode <= 57) || (event.keyCode >= 96 && event.keyCode <= 105) || event.keyCode == 109) && (value.length >= scope.dynamicMaxlength)) {
                        if (!(element[0].value.length == element[0].selectionEnd && element[0].selectionStart == 0) && element[0].selectionStart == element[0].selectionEnd) {
                            event.preventDefault();
                        }
                    }
                }
            });

            element.on("blur", function () {
                var filteredvalue = '';
                if (isNaN(ngModelCtrl.$modelValue)) {
                    ngModelCtrl.$modelValue = 0;
                    filteredvalue = $filter('number')(ngModelCtrl.$modelValue, (scope.precision != undefined ? scope.precision : 2));
                }
                else {
                    filteredvalue = $filter('number')(parseFloat(ngModelCtrl.$modelValue), (scope.precision != undefined ? scope.precision : 2));
                }
                var transformedInput = filteredvalue.replace(',', '');
                if (transformedInput == '') {
                    transformedInput = Number("0").toFixed(scope.precision);
                }
                ngModelCtrl.$setViewValue(transformedInput);
                ngModelCtrl.$render();
                return transformedInput;
            });

            scope.$on('$destroy', function () {
                element.remove();
            });
        }
    };
}]);


function IsTextWithoutSpace(event) {
    var result = true;
    if (event.keyCode == 32) {
        result = false;
    }
    return result;
}
