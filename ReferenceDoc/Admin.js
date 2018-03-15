angular.module("SiplPortal").controller("AdminController", ['$scope', 'ngEncryption', '$http', '$location', '$rootScope', '$compile', '$cookies', '$cookieStore', '$window', '$timeout', '$filter', '$modal', '$linq',
function ($scope, ngEncryption, $http, $location, $rootScope, $compile, $cookies, $cookieStore, $window, $timeout, $filter, $modal, $linq) {
    $scope.LoginId = "";
    $scope.UserId = 0;
    $scope.ShowCompanyddl = false;

    //Load CompanyWise UserList
    var LoadUserList = function () {
        $scope.HideValidationDiv();
        angular.element('#lnkAssignMachine').hide();
        $scope.LoginId = "";
        $http({
            method: "GET",
            url: "/api/Admin/LoadUserList",
        }).then(function (successData) {
            if (successData.status == "202") {
                $scope.ErrorMsg = successData.data;
                angular.element("#idReqValidation").show();
                angular.element('#GridUserList').hide();
                return;
            }
            var result = JSON.parse(successData.data);
            if (result == null || result.length == 0)
                angular.element('#GridUserList').hide();
            else {
                $scope.UserList = result;
                angular.element('#GridUserList').show();

                if ($(window).width() > 767)
                    LoadResize('idUserTable');
            }
        }, function (error) {
            $scope.ErrorMsg = error;
            angular.element("#idReqValidation").show();
            angular.element('#GridUserList').hide();
        });
    }

    //Get Company List and bind to dropdown
    function BindCompany() {
        var request = $http({
            method: "GET",
            url: "/api/Admin/GetCompanyList"
        });
        request.success(function (data) {
            if (data == '')
                return;
            $scope.CompanyList = JSON.parse(data);
            if ($scope.CompanyList.length == 0) {
                return;
            }
            if ($scope.CompanyList.length > 1) {
                $scope.CompanyId = $scope.CompanyList[0].CompanyId.toString();
                $scope.ShowCompanyddl = true;
            }
            AssignCompany();
        });
    }

    BindCompany()

    //Load Custom scrollbar
    LoadCustomScroll('#idUserTable');

    //Select Company : Store Selected CompanyId in Token
    function AssignCompany() {
        if ($scope.CompanyList.length == 1) {
            $scope.CompanyId = $scope.CompanyList[0].CompanyId.toString();
        }
        $http({
            method: "POST",
            url: "/api/Admin/ResetToken",
            params: { companyId: $scope.CompanyId }
        }).success(function (data) {
            if (data == 'success')
                LoadUserList();
        }).error(function (error) {
        });
    }

    $scope.AssignCompany = function () {
        if ($scope.CompanyId == undefined || $scope.CompanyId == '')
            return;
        AssignCompany();
    }

    //call when list rendered
    $scope.$on('renderListFinished', function (ngRepeatFinishedEvent) {
        loadFootable();
    });

    //Hide Validation Div
    $scope.HideValidationDiv = function () {
        angular.element('#idReqValidation').hide();
        $scope.ErrorMsg = '';
    }

    $scope.HideValidationDiv();

    //Search User
    $scope.SearchUser = function (IsValid) {
        angular.element('#lnkAssignMachine').hide();
        $scope.HideValidationDiv();
        if (!IsValid) {
            angular.element("#idReqValidation").show();
            return;
        }

        var data = JSON.stringify({ 'LoginId': $scope.LoginId });
        $http({
            method: "GET",
            url: "/api/Admin/SearchUser",
            params: { requestParam: data }
        }).then(function (successData) {
            if (successData.status == "202") {
                if (successData.data == "MaxUserLimitCrossed") {
                    var currCompany = $linq.Enumerable().From($scope.CompanyList)
                                                         .Where(function (x) {
                                                             return (x.CompanyId == $scope.CompanyId);
                                                         })
                                                         .Select(function (x) {
                                                             return x;
                                                         }).FirstOrDefault();

                    if (currCompany != null) {
                        successData.data = currCompany.MaxUserLimit + " User(s) are already assigned to Company " + currCompany.CompanyName;
                        //successData.data = "Cannot assign more than ( " + currMaxUserLimit + " ) users.";
                    }
                }
                $scope.ErrorMsg = successData.data;

                angular.element("#idReqValidation").show();
                return;
            }
            if (successData.data == '') {
                $scope.ErrorMsg = 'No Records Found.'
                angular.element("#idReqValidation").show();
                return;
            }
            $scope.UserId = Number(successData.data);
            angular.element('#lnkAssignMachine').show();
        }, function (error) {
            $scope.ErrorMsg = error;
            angular.element("#idReqValidation").show();
        });
    }

    //Open SiteMachineListPopup
    $scope.OpenAssignMachinePopup = function (size, controllername, templateurlvalue, UserId) {
        $scope.parentControlValues = {};
        $scope.parentControlValues.UserId = UserId;
        var modalInstance = $modal.open({
            controller: controllername,
            templateUrl: templateurlvalue,
            size: size,
            backdrop: 'static',
            keyboard: false,
            resolve: {
                ParentControlDetails: function () {
                    return $scope.parentControlValues;
                }
            }
        });

        modalInstance.result.then(function () {
            //Load User after popup close
            LoadUserList();

            angular.element('#lnkAssignMachine').hide();
            $scope.LoginId = '';
        });
    }
}]);

angular.module("SiplPortal").controller("AssignMachineController", ['$scope', 'ngEncryption', '$http', '$location', '$rootScope', '$compile', '$cookies', '$cookieStore', '$window', '$timeout', '$filter', '$modalInstance', 'ParentControlDetails',
function ($scope, ngEncryption, $http, $location, $rootScope, $compile, $cookies, $cookieStore, $window, $timeout, $filter, $modalInstance, ParentControlDetails) {

    //Close Popup
    $scope.close = function () {
        // $modalInstance.dismiss('cancel');
        $modalInstance.close();
    };

    //Hide Validation Div
    $scope.HideValidationDiv = function () {
        $scope.ErrorMsg = '';
        $scope.AssignSuccess = false;
    }

    if (ParentControlDetails != undefined && ParentControlDetails.UserId != undefined && ParentControlDetails.UserId != null && ParentControlDetails.UserId != "") {
        $scope.UserId = ParentControlDetails.UserId;
    }

    //Load CompanyWise Site and Machine to assign
    var LoadSiteMachineToAssign = function (userId) {
        if (typeof (userId) == 'undefined')
            userId = 0;
        $scope.UserId = userId;
        var data = JSON.stringify({ 'UserId': userId });
        $http({
            method: "GET",
            url: "/api/Admin/LoadSiteMachineToAssign",
            params: { requestParam: data }
        }).then(function (successData) {
            if (successData.status == "202") {
                $scope.ErrorMsg = successData.data;
                angular.element('#GridSiteMachineList').hide();
                return;
            }
            if (successData.data == '') {
                $scope.ErrorMsg = 'No Records Found.'
                angular.element('#GridSiteMachineList').hide();
                return;
            }
            var result = JSON.parse(successData.data);
            if (result != null && result.ListCompSiteMasterBO.length > 0) {
                $scope.SiteList = result.ListCompSiteMasterBO;
                //Set Site checkbox
                $scope.SiteList.forEach(function (site, index) {
                    var isAssign = false;
                    for (var i = 0; i < site.ListMachineMasterBO.length; i++) {
                        if (site.ListMachineMasterBO[i].IsAssigned == false) {
                            isAssign = false;
                            break;
                        }
                        else
                            isAssign = true;
                    }
                    if (isAssign == true)
                        site.CompSiteNameCheck = true;
                });
                angular.element('#GridSiteMachineList').show();
                //Load Custom scrollbar
                LoadCustomScroll('#IdSiteMachineTable');
                LoadResize('IdSiteMachineTable', 80);
            }
            else {
                $scope.ErrorMsg = "Company Site not found";
                angular.element('#GridSiteMachineList').hide();
            }
        }, function (error) {
            $scope.ErrorMsg = error;
        });
    }

    LoadSiteMachineToAssign($scope.UserId);

    //Change All Child Machine Checkbox
    $scope.ChangeAllChildCheckBox = function (site, CompSiteNameCheck) {
        if (CompSiteNameCheck == true) {
            site.ListMachineMasterBO.forEach(function (machine, index) {
                machine.IsAssigned = true;
            });
        }
        else {
            site.ListMachineMasterBO.forEach(function (machine, index) {
                machine.IsAssigned = false;
            });
        }
    }

    //Change Parent Site Checkbox
    $scope.ChangeParentCheckbox = function (ListMachineMasterBO, site) {
        var Istrue = false;
        for (var i = 0; i < ListMachineMasterBO.length; i++) {
            if (ListMachineMasterBO[i].IsAssigned == false) {
                Istrue = false;
                break;
            }
            else
                Istrue = true;
        }

        if (Istrue == false)
            site.CompSiteNameCheck = false;
        else
            site.CompSiteNameCheck = true;
    }

    //Assign - Unassign Machine
    $scope.SaveAssign = function () {
        $scope.AssignSuccess = false;;
        var machineIds = ''
        $scope.SiteList.forEach(function (site, index) {
            site.ListMachineMasterBO.forEach(function (machine, index) {
                if (machine.IsAssigned == true)
                    machineIds += machine.MachineId + ",";
            });
        });
        if (machineIds != '')
            machineIds = machineIds.slice(0, -1);
        var data = JSON.stringify({ 'UserId': $scope.UserId, 'MachineIds': machineIds });
        $http({
            method: "POST",
            url: "/api/Admin/AssignMachine",
            params: { requestParam: data }
        }).then(function (successData) {
            if (successData.status == "202") {
                $scope.ErrorMsg = successData.data;
                return;
            }
            if (successData.data == 'Y') {
                $scope.AssignSuccess = true;
                $scope.SuccessMessage = "Machine(s) assigned successfully."
            }
        }, function (error) {
            $scope.ErrorMsg = error;
        });
    }
}]);

angular.module("SiplPortal").controller("UnlockUserController", ['$scope', 'ngEncryption', '$http', '$location', '$rootScope', '$compile', '$cookies', '$cookieStore', '$window', '$timeout', '$filter',
function ($scope, ngEncryption, $http, $location, $rootScope, $compile, $cookies, $cookieStore, $window, $timeout, $filter) {

    //call when list rendered
    $scope.$on('renderListFinished', function (ngRepeatFinishedEvent) {
        loadFootable();
    });

    //Hide Validation Div
    $scope.HideValidationDiv = function () {
        angular.element('#idReqValidation').hide();
        $scope.ErrorMsg = '';
        $scope.UnlockSuccess = false;
        $scope.SuccessMessage = '';
    }

    $scope.HideValidationDiv();

    //Load CompanyWise UserList
    var LoadUserList = function () {
        $http({
            method: "GET",
            url: "/api/Admin/LoadLockedUserList",
        }).then(function (successData) {
            if (successData.status == "202") {
                $scope.ErrorMsg = successData.data;
                angular.element("#idReqValidation").show();
                angular.element('#GridUserList').hide();
                return;
            }
            var result = JSON.parse(successData.data);
            if (result == null || result.length == 0) {
                angular.element("#idReqValidation").show();
                $scope.ErrorMsg = "No Locked Users found.";
                angular.element('#GridUserList').hide();
            }
            else {
                $scope.UserList = result;
                angular.element('#GridUserList').show();
            }
        }, function (error) {
            $scope.ErrorMsg = error;
            angular.element("#idReqValidation").show();
            angular.element('#GridUserList').hide();
        });
    }

    LoadUserList();

    //Load Custom scrollbar
    LoadCustomScroll('#idUserTable');

    $scope.SaveUnlock = function () {
        angular.element("#idReqValidation").hide();
        var userIds = '';
        $scope.UserList.forEach(function (user, index) {
            if (user.IsManual) {
                userIds += user.UserId + ",";
            }
        });
        userIds = userIds.slice(0, -1);
        if (userIds == '') {
            $scope.ErrorMsg = 'Please select at least one user.';
            angular.element("#idReqValidation").show();
            return;
        }
        var data = JSON.stringify({ 'UserIds': userIds });
        $http({
            method: "POST",
            url: "/api/Admin/UnlockUser",
            params: { requestParam: data }
        }).then(function (successData) {
            if (successData.status == "202") {
                $scope.ErrorMsg = successData.data;
                angular.element("#idReqValidation").show();
                return;
            }
            if (successData.data == 'Y') {
                $scope.UnlockSuccess = true;
                $scope.SuccessMessage = "User(s) unlocked successfully.";
                LoadUserList();
            }
        }, function (error) {
            $scope.ErrorMsg = error;
        });
    }
}]);

angular.module("SiplPortal").controller("AssignCompanyController", ['$scope', 'ngEncryption', '$http', '$location', '$rootScope', '$compile', '$cookies', '$cookieStore', '$window', '$timeout', '$filter', '$modal',
function ($scope, ngEncryption, $http, $location, $rootScope, $compile, $cookies, $cookieStore, $window, $timeout, $filter, $modal) {
    $scope.LoginId = "";
    $scope.UserId = 0;

    //Load Users which are admin of at least one company
    var LoadUserList = function () {
        $http({
            method: "GET",
            url: "/api/Admin/LoadAdminUserList",
        }).then(function (successData) {
            if (successData.status == "202") {
                $scope.ErrorMsg = successData.data;
                angular.element("#idReqValidation").show();
                angular.element('#GridUserList').hide();
                return;
            }
            var result = JSON.parse(successData.data);
            if (result == null || result.length == 0)
                angular.element('#GridUserList').hide();
            else {
                $scope.UserList = result;
                angular.element('#GridUserList').show();

                if ($(window).width() > 767)
                    LoadResize('idUserTable');
            }
        }, function (error) {
            $scope.ErrorMsg = error;
            angular.element("#idReqValidation").show();
            angular.element('#GridUserList').hide();
        });
    }

    LoadUserList();

    //Load Custom scrollbar
    LoadCustomScroll('#idUserTable');

    //call when list rendered
    $scope.$on('renderListFinished', function (ngRepeatFinishedEvent) {
        loadFootable();
    });

    //Hide Validation Div
    $scope.HideValidationDiv = function () {
        angular.element('#idReqValidation').hide();
        $scope.ErrorMsg = '';
    }

    $scope.HideValidationDiv();

    //Search User
    $scope.SearchUser = function (IsValid) {
        angular.element('#lnkAssignCompany').hide();
        $scope.HideValidationDiv();
        if (!IsValid) {
            angular.element("#idReqValidation").show();
            return;
        }

        var data = JSON.stringify({ 'LoginId': $scope.LoginId });
        $http({
            method: "GET",
            url: "/api/Admin/SearchUnassignedUser",
            params: { requestParam: data }
        }).then(function (successData) {
            if (successData.status == "202") {
                $scope.ErrorMsg = successData.data;
                angular.element("#idReqValidation").show();
                return;
            }
            if (successData.data == '') {
                $scope.ErrorMsg = 'No Records Found.'
                angular.element("#idReqValidation").show();
                return;
            }
            $scope.UserId = Number(successData.data);
            angular.element('#lnkAssignCompany').show();
        }, function (error) {
            $scope.ErrorMsg = error;
            angular.element("#idReqValidation").show();
        });
    }

    //Open Company List Popup
    $scope.OpenAssignCompanyPopup = function (size, controllername, templateurlvalue, UserId) {
        $scope.parentControlValues = {};
        $scope.parentControlValues.UserId = UserId;
        var modalInstance = $modal.open({
            controller: controllername,
            templateUrl: templateurlvalue,
            size: size,
            backdrop: 'static',
            keyboard: false,
            resolve: {
                ParentControlDetails: function () {
                    return $scope.parentControlValues;
                }
            }
        });

        modalInstance.result.then(function () {
            //Load User after popup close
            LoadUserList();

            angular.element('#lnkAssignCompany').hide();
            $scope.LoginId = '';
        });
    }
}]);

angular.module("SiplPortal").controller("AssignCompanyPopupController", ['$scope', 'ngEncryption', '$http', '$location', '$rootScope', '$compile', '$cookies', '$cookieStore', '$window', '$timeout', '$filter', '$modalInstance', 'ParentControlDetails',
function ($scope, ngEncryption, $http, $location, $rootScope, $compile, $cookies, $cookieStore, $window, $timeout, $filter, $modalInstance, ParentControlDetails) {

    //Close Popup
    $scope.close = function () {
        $modalInstance.close();
    };

    //Hide Validation Div
    $scope.HideValidationDiv = function () {
        $scope.ErrorMsg = '';
        $scope.AssignSuccess = false;
    }

    if (ParentControlDetails != undefined && ParentControlDetails.UserId != undefined && ParentControlDetails.UserId != null && ParentControlDetails.UserId != "") {
        $scope.UserId = ParentControlDetails.UserId;
    }

    //Load Company List
    var LoadCompanyList = function (userId) {
        if (typeof (userId) == 'undefined')
            userId = 0;
        $scope.UserId = userId;
        var data = JSON.stringify({ 'UserId': userId });
        $http({
            method: "GET",
            url: "/api/Admin/LoadCompanyList",
            params: { requestParam: data }
        }).then(function (successData) {
            if (successData.status == "202") {
                $scope.ErrorMsg = successData.data;
                angular.element('#GridCompanyList').hide();
                return;
            }
            if (successData.data == '') {
                $scope.ErrorMsg = 'No Records Found.'
                angular.element('#GridCompanyList').hide();
                return;
            }
            var result = JSON.parse(successData.data);
            if (result != null && result.length > 0) {
                $scope.CompanyList = result;
                angular.element('#GridCompanyList').show();
                //Load Custom scrollbar
                LoadCustomScroll('#IdCompanyTable');
                LoadResize('IdCompanyTable', 80);
            }
            else {
                $scope.ErrorMsg = "No Company found";
                angular.element('#GridCompanyList').hide();
            }
        }, function (error) {
            $scope.ErrorMsg = error;
        });
    }

    LoadCompanyList($scope.UserId);

    //Assign - Unassign Machine
    $scope.SaveAssign = function () {
        $scope.AssignSuccess = false;;
        var companyIds = ''
        $scope.CompanyList.forEach(function (company, index) {
            if (company.IsAssigned == true)
                companyIds += company.CompanyId + ",";
        });
        if (companyIds != '')
            companyIds = companyIds.slice(0, -1);
        var data = JSON.stringify({ 'UserId': $scope.UserId, 'CompanyIds': companyIds });
        $http({
            method: "POST",
            url: "/api/Admin/AssignCompany",
            params: { requestParam: data }
        }).then(function (successData) {
            if (successData.status == "202") {
                $scope.ErrorMsg = successData.data;
                return;
            }
            if (successData.data == 'Y') {
                $scope.AssignSuccess = true;
                $scope.SuccessMessage = "Company(s) assigned successfully."
            }
        }, function (error) {
            $scope.ErrorMsg = error;
        });
    }
}]);

angular.module("SiplPortal").controller("CompanyController", ['$scope', '$http', '$rootScope', '$compile', '$location', '$timeout', '$filter', 'DataService', '$modal',
function ($scope, $http, $rootScope, $compile, $location, $timeout, $filter, DataService, $modal) {

    var preservedData = DataService.GetServiceData();
    DataService.ResetServiceData();
    var resultvalue = preservedData.Result;
    if ((resultvalue != undefined) && (resultvalue != '') && resultvalue == 'success') {
        $scope.SuccessMessage = "Company saved successfully.";
        $scope.Success = true;
    }

    var companyddlLoaded = false;
    $scope.CompanyNameList = [];
    $scope.CompanyId = "0";

    $scope.HideValidationDiv = function () {
        $scope.ErrorMsg = "";
        $scope.Success = false;
        $scope.SuccessMessage = '';
    }

    //Load Company List
    var LoadCompanyList = function () {
        $scope.CompanyList = [];
        $scope.ErrorMsg = '';
        var data = JSON.stringify({ 'CompanyId': $scope.CompanyId });
        $http({
            method: "GET",
            url: "/api/Admin/LoadAllCompanies",
            params: { requestParam: data }
        }).then(function (successData) {
            if (successData.status == "202") {
                $scope.ErrorMsg = successData.data;
                angular.element('#GridCompanyList').hide();
                return;
            }
            if (successData.data == '') {
                $scope.ErrorMsg = 'No Records Found.'
                angular.element('#GridCompanyList').hide();
                return;
            }
            var result = JSON.parse(successData.data);
            if (result != null && result.length > 0) {
                $scope.CompanyList = result;
                if (!companyddlLoaded) {
                    $scope.CompanyNameList = result;
                    companyddlLoaded = true;
                }
                angular.element('#GridCompanyList').show();
                if ($(window).width() > 767)
                    LoadResize('idCompanyTable');
            }
            else {
                $scope.ErrorMsg = "No Company found";
                angular.element('#GridCompanyList').hide();
            }
        }, function (error) {
            $scope.ErrorMsg = error;
        });
    }

    LoadCompanyList();

    //Load Custom scrollbar
    LoadCustomScroll('#idCompanyTable');

    //call when list rendered
    $scope.$on('renderListFinished', function (ngRepeatFinishedEvent) {
        loadFootable();
    });

    // Search Company
    $scope.SearchCompany = function () {
        LoadCompanyList();
    }

    //Redirect to save company screen for Add
    $scope.AddCompany = function () {
        $location.path('/SAVECOMPANY');
    }

    //Redirect to save company screen for Edit
    $scope.EditCompany = function (companyId) {
        var preservedData = { "CompanyId": companyId }
        DataService.SetServiceData(preservedData);
        $location.path('/SAVECOMPANY');
    }

    $scope.OpenUpdateAdminPopup = function (size, controllername, templateurlvalue, CompanyId) {
        $scope.HideValidationDiv();
        $scope.parentControlValues = {};
        $scope.parentControlValues.CompanyId = CompanyId;
        var modalInstance = $modal.open({
            controller: controllername,
            templateUrl: templateurlvalue,
            size: size,
            backdrop: 'static',
            keyboard: false,
            resolve: {
                ParentControlDetails: function () {
                    return $scope.parentControlValues;
                }
            }
        });

        modalInstance.result.then(function () {
            //Refress Company List
            $scope.SuccessMessage = "Company Admin updated successfully.";
            $scope.Success = true;
            LoadCompanyList();
        });
    }
}]);

angular.module("SiplPortal").controller("UpdateAdminPopupController", ['$scope', '$http', '$location', '$window', '$timeout', '$filter', '$modalInstance', 'ParentControlDetails',
function ($scope, $http, $location, $window, $timeout, $filter, $modalInstance, ParentControlDetails) {

    //Close Popup    
    $scope.close = function () {
        $modalInstance.dismiss('cancel');
        //$modalInstance.close();
    };

    //Hide Validation Div
    $scope.HideValidationDiv = function () {
        angular.element('#idReqValidation').hide();
        $scope.ErrorMsg = '';
    }
    $scope.HideValidationDiv();
    $scope.model = {
        CompanyAdmin: ''
    };


    if (ParentControlDetails != undefined && ParentControlDetails.CompanyId != undefined && ParentControlDetails.CompanyId != null && ParentControlDetails.CompanyId != "") {
        $scope.model.CompanyId = ParentControlDetails.CompanyId;
    }

    $scope.Save = function (Isvalid) {
        if (Isvalid)
            SaveAdmin();
        else
            angular.element('#idReqValidation').show();
    }

    function SaveAdmin() {
        var data = JSON.stringify($scope.model);
        $http({
            method: 'POST',
            url: '/api/Admin/UpdateCompanyAdmin',
            params: { requestParam: data }
        }).then(function (successData) {
            if (successData.status == 202) {
                $scope.ErrorMsg = successData.data;
                angular.element('#idReqValidation').show();
                return;
            }
            $modalInstance.close();
        });
    }
}]);

angular.module("SiplPortal").controller("SaveCompanyController", ['$scope', '$http', '$rootScope', '$compile', '$location', '$timeout', '$filter', '$modal', '$linq', 'DataService',
function ($scope, $http, $rootScope, $compile, $location, $timeout, $filter, $modal, $linq, DataService) {

    //Company Object
    $scope.Company = {
        CompanyId: 0,
        CompanyName: '',
        CompanyLogo: '',
        CompanyAdmin: ''
    };

    var LoadCompany = function () {
        var data = JSON.stringify({ 'CompanyId': $scope.Company.CompanyId });
        $http({
            method: "GET",
            url: "/api/Admin/LoadCompany",
            params: { requestParam: data }
        }).then(function (successData) {
            if (successData.status == "202") {
                $scope.ErrorMsg = successData.data;
                return;
            }
            if (successData.data == '') {
                $scope.ErrorMsg = 'No Company Found.'
                return;
            }
            var result = JSON.parse(successData.data);
            if (result != null) {
                $scope.Company = result;
            }
            else {
                $scope.ErrorMsg = "No Company found";
            }
        }, function (error) {
            $scope.ErrorMsg = error;
        });
    };
    var preservedData = DataService.GetServiceData();
    DataService.ResetServiceData();
    var companyId = preservedData.CompanyId;
    if ((companyId != undefined) && (companyId != '') && companyId > 0) {
        $scope.Company.CompanyId = companyId;
        $scope.Title = "Update Company";
        LoadCompany();
    }
    else
        $scope.Title = "Add Company";

    $scope.HideValidationDiv = function () {
        angular.element('#idReqValidation').hide();
        $scope.ErrorMsg = "";
        $scope.Success = false;
    }

    $scope.HideValidationDiv();

    $scope.Cancel = function () {
        $location.path('/COMPANYMASTER');
    }

    $scope.SaveCompany = function (IsValid) {
        $scope.HideValidationDiv();
        if (IsValid)
            SaveCompany();
        else
            angular.element('#idReqValidation').show();
    }

    function SaveCompany() {
        var data = JSON.stringify($scope.Company);
        $http({
            method: "POST",
            url: "/api/Admin/SaveCompany",
            dataType: 'json',
            contentType: false,
            processData: false,
            params: { requestParam: data }
        }).then(function (successData) {
            if (successData.status == "202") {
                $scope.ErrorMsg = successData.data;
                angular.element('#idReqValidation').show();
                return;
            }
            if (successData.data == 'Y') {
                var preservedData = { "Result": 'success' }
                DataService.SetServiceData(preservedData);
                $location.path('/COMPANYMASTER');
            }
        }, function (error) {
            $scope.ErrorMsg = error;
        });
    }

    //For File Upload
    $scope.UploadLogo = function () {
        $scope.parentControlValues = {};
        if ($scope.Company.CompanyLogo != '')
            $scope.parentControlValues.oldCompanyLogo = $scope.Company.CompanyLogo;
        angular.element('#idValidationPopup').hide();
        var modalInstance = $modal.open({
            controller: "FileUploadCtrl",
            templateUrl: "/UploadFile/UploadFile",
            size: "md",
            backdrop: 'static',
            resolve: {
                ParentControlDetails: function () {
                    return $scope.parentControlValues;
                }
            }
        });

        modalInstance.result.then(function () {
            $scope.Company.CompanyLogo = $scope.parentControlValues.uploadedfileName;
            $scope.Company.LogoPath = $scope.parentControlValues.uploadedfilePath;
        });
    }

    //Open Company Site List Popup
    $scope.OpenAddSitePopup = function (size, controllername, templateurlvalue, CompanyId) {
        $scope.parentControlValues = {};
        $scope.parentControlValues.CompanyId = CompanyId;
        if ($scope.Company.ListCompSiteMasterBO != undefined)
            $scope.parentControlValues.ListCompSiteMasterBO = angular.copy($scope.Company.ListCompSiteMasterBO);
        var modalInstance = $modal.open({
            controller: controllername,
            templateUrl: templateurlvalue,
            size: size,
            backdrop: 'static',
            keyboard: false,
            resolve: {
                ParentControlDetails: function () {
                    return $scope.parentControlValues;
                }
            }
        });

        modalInstance.result.then(function () {
            //Remove entry where SiteName is empty
            var siteList = $linq.Enumerable().From($scope.parentControlValues.ListCompSiteMasterBO)
                                                    .Where(function (x) {
                                                        return (x.CompSiteName != '');
                                                    })
                                                    .Select(function (x) {
                                                        return x;
                                                    }).ToArray();
            //Remove entry where MachineName or Dongle Number or MachineCode is empty
            siteList.forEach(function (site, index) {
                var machineList = $linq.Enumerable().From(site.ListMachineMasterBO)
                                                    .Where(function (x) {
                                                        return (x.MachineName != '' && x.MachineCode != '' && x.MachineDongle != '');
                                                    })
                                                    .Select(function (x) {
                                                        return x;
                                                    }).ToArray();
                site.ListMachineMasterBO = machineList;
            });
            $scope.Company.ListCompSiteMasterBO = [];
            $scope.Company.ListCompSiteMasterBO = siteList;
        });
    }
}]);

angular.module("SiplPortal").controller("SitePopupController", ['$scope', 'ngEncryption', '$http', '$location', '$rootScope', '$compile', '$cookies', '$cookieStore', '$window', '$timeout', '$filter', '$modalInstance', 'ParentControlDetails', 'ConfirmMsgBox', '$linq',
function ($scope, ngEncryption, $http, $location, $rootScope, $compile, $cookies, $cookieStore, $window, $timeout, $filter, $modalInstance, ParentControlDetails, ConfirmMsgBox, $linq) {
    $scope.saveBtn = false;
    //Save Data & Close Popup
    $scope.Save = function () {
        ParentControlDetails.ListCompSiteMasterBO = angular.copy($scope.ListCompSiteMasterBO);
        $modalInstance.close();
    };

    $scope.close = function () {
        $modalInstance.dismiss('cancel');
    };

    $scope.HideValidationDiv = function () {
        $scope.ErrorMsg = "";
    }

    if (ParentControlDetails != undefined && ParentControlDetails.CompanyId != undefined && ParentControlDetails.CompanyId != null && ParentControlDetails.CompanyId != "") {
        $scope.CompanyId = ParentControlDetails.CompanyId;
    }

    $scope.ListCompSiteMasterBO = [];
    if (ParentControlDetails != undefined && ParentControlDetails.ListCompSiteMasterBO != undefined && ParentControlDetails.ListCompSiteMasterBO != null && ParentControlDetails.ListCompSiteMasterBO != []) {
        $scope.ListCompSiteMasterBO = ParentControlDetails.ListCompSiteMasterBO;
    }

    function CallLoadResize() {
        //Load Custom scrollbar
        LoadCustomScroll('#Idsitetable');
        LoadResize('Idsitetable', 90);
    }

    $timeout(function () {
        if ($scope.ListCompSiteMasterBO.length > 0) {
            angular.element('#SiteMachineGrid').show();
            CallLoadResize();
        }
    }, 0);

    //Add New Site
    $scope.AddNewSiteDetail = function () {
        $scope.ListCompSiteMasterBO.push(NewSiteObj("", ""));
        var LastRecord = $scope.ListCompSiteMasterBO.length - 1;
        $timeout(function () {
            if (!angular.element('#SiteMachineGrid').is(':visible')) {
                angular.element('#SiteMachineGrid').show();
                CallLoadResize();
            }
            angular.element("#txtSiteName_" + LastRecord + "").focus();
        }, 0);
    }

    //Delete Site
    $scope.DeleteSite = function (index, site) {
        $scope.ListCompSiteMasterBO.splice(index, 1);
        $timeout(function () {
            if ($scope.ListCompSiteMasterBO.length <= 0) {
                angular.element('#SiteMachineGrid').hide();
            }
        }, 0);
        //var new_dialog = ConfirmMsgBox.ReferMsg('RMC Portal', 'Are you sure you want to Delete this record?');
        //if (new_dialog != undefined) {
        //    new_dialog.then(
        //         function (value) {
        //             if (value == 1) {
        //                 $scope.SiteList.splice(index, 1);
        //             }
        //         });
        //}
    }

    //Add New Machine
    $scope.AddNewMachineDetail = function (site, siteIndex) {
        if (site.ListMachineMasterBO == undefined)
            site.ListMachineMasterBO = [];
        site.ListMachineMasterBO.push(NewMachineObj("", ""));
        var LastRecord = site.ListMachineMasterBO.length - 1;
        $timeout(function () {
            angular.element("#txtMachineName_" + siteIndex + LastRecord + "").focus();
        }, 0);
    }

    //Delete Machine
    $scope.DeleteMachine = function (index, site) {
        site.ListMachineMasterBO.splice(index, 1);
    }

    //Site Object
    var NewSiteObj = function () {
        return {
            "CompSiteId": 0,
            "CompSiteName": ""
        }
    }

    //Machine Object
    var NewMachineObj = function () {
        return {
            "MachineId": 0,
            "MachineName": "",
            "MachineCode": "",
            "MachineDongle": ""
        }
    }

    $scope.DupDongle = false;
    $scope.DupMachineCode = false;
    //Validate Dongle Serial
    $scope.checkUniqueDongle = function (MachineDongle) {
        var allMachine = [];
        $scope.ListCompSiteMasterBO.forEach(function (site, index) {
            site.ListMachineMasterBO.forEach(function (machine, index) {
                allMachine.push(machine);
            });
        });

        var dupmachine = $linq.Enumerable().From(allMachine)
                                                .Where(function (x) {
                                                    return (x.MachineDongle == MachineDongle && MachineDongle != undefined && MachineDongle != '' && MachineDongle != null);
                                                })
                                                .Select(function (x) {
                                                    return x;
                                                }).ToArray();
        if (dupmachine.length > 1) {
            $scope.ErrorMsg = 'Dongle Serial must be unique';
            $scope.DupDongle = true;
        }
        else {
            $scope.ErrorMsg = '';
            $scope.DupDongle = false;
        }

        if ($scope.DupMachineCode || $scope.DupDongle)
            $scope.saveBtn = true;
        else
            $scope.saveBtn = false;
    };

    //Validate Machine Code
    $scope.checkUniqueCode = function (MachineCode) {
        var allMachine = [];
        $scope.ListCompSiteMasterBO.forEach(function (site, index) {
            site.ListMachineMasterBO.forEach(function (machine, index) {
                allMachine.push(machine);
            });
        });

        var dupmachine = $linq.Enumerable().From(allMachine)
                                               .Where(function (x) {
                                                   return (x.MachineCode == MachineCode && MachineCode != undefined && MachineCode != '' && MachineCode != null);
                                               })
                                               .Select(function (x) {
                                                   return x;
                                               }).ToArray();
        if (dupmachine.length > 1) {
            $scope.ErrorMsg1 = 'Machine Code must be unique';
            $scope.DupMachineCode = true;
        }
        else {
            $scope.ErrorMsg1 = '';
            $scope.DupMachineCode = false;
        }

        if ($scope.DupMachineCode || $scope.DupDongle)
            $scope.saveBtn = true;
        else
            $scope.saveBtn = false;
    };
}]);

angular.module("SiplPortal").controller("ShiftController", ['$scope', '$http', '$location', '$rootScope', '$compile', '$window', '$timeout',
function ($scope, $http, $location, $rootScope, $compile, $window, $timeout) {
    $scope.ShowCompanyddl = false;
    $scope.ShowCompanylbl = false;

    //Shift variables
    $scope.Shift = {
        ShiftMasterId1: 0,
        FromTime1: "",
        ToTime1: "",
        ShiftMasterId2: 0,
        FromTime2: "",
        ToTime2: "",
        ShiftMasterId3: 0,
        FromTime3: "",
        ToTime3: ""
    }

    $scope.HideValidationDiv = function () {
        angular.element('#idReqValidation').hide();
        $scope.ErrorMsg = "";
        $scope.ErrorMsg2 = "";
        $scope.ErrorMsg3 = "";
        $scope.SuccessMessage = '';
    }

    $scope.HideValidationDiv();

    //Get Company List and bind to dropdown
    function BindCompany() {
        var request = $http({
            method: "GET",
            url: "/api/Admin/GetCompanyList"
        });
        request.success(function (data) {
            if (data == '')
                return;
            $scope.CompanyList = JSON.parse(data);
            if ($scope.CompanyList.length == 0)
                return;
            $scope.CompanyId = $scope.CompanyList[0].CompanyId.toString();
            if ($scope.CompanyList.length > 1)
                $scope.ShowCompanyddl = true;
            else {
                $scope.ComanyName = $scope.CompanyList[0].CompanyName;
                $scope.ShowCompanylbl = true;
            }
            //Load existing shift data of selected Company
            GetShiftDetails();
        });
    }

    BindCompany();

    //Get Shift Details by Company Id
    function GetShiftDetails() {
        $scope.HideValidationDiv();
        var data = JSON.stringify({ 'CompanyId': $scope.CompanyId });
        $http({
            method: 'GET',
            url: '/api/Admin/GetCompanyWiseShiftDetails',
            params: { requestParam: data }
        }).then(function (responseData) {
            if (responseData.status == 202) {
                $scope.ErrorMsg = responseData.data;
                angular.element('#idReqValidation').show();
                return;
            }
            if (responseData.data == '') {
                return;
            }
            $scope.ShiftListOri = $scope.ShiftList = JSON.parse(responseData.data);
            ListToScopeVariable($scope.ShiftList);
        });
    }

    $scope.ChangeCompany = function () {
        GetShiftDetails();
    }

    $scope.SaveCompanyShift = function (isValid) {
        $scope.HideValidationDiv();
        if (isValid)
            SaveCompanyShift();
        else
            angular.element('#idReqValidation').show();
    };

    //Reset Shift data
    $scope.Reset = function () {
        $scope.HideValidationDiv();
        ListToScopeVariable($scope.ShiftListOri);
    }

    function timeToSeconds(time) {
        time = time.split(/:/);
        return time[0] * 3600 + time[1] * 60;
    }

    //Validate Shift Time
    function ValidateShiftTime() {
        var fromTime1 = timeToSeconds($scope.Shift.FromTime1);
        var toTime1 = timeToSeconds($scope.Shift.ToTime1);
        var fromTime2 = timeToSeconds($scope.Shift.FromTime2);
        var toTime2 = timeToSeconds($scope.Shift.ToTime2);
        var fromTime3 = timeToSeconds($scope.Shift.FromTime3);
        var toTime3 = timeToSeconds($scope.Shift.ToTime3);
        var totalTime = timeToSeconds("24:00");        
        var diff1, diff2, diff3;
        if (fromTime1 > toTime1) {
            diff1 = totalTime - (fromTime1 - toTime1) + 60;
        } else {
            diff1 = toTime1 - fromTime1 + 60;
        }

        if (fromTime2 > toTime2) {
            diff2 = totalTime - (fromTime2 - toTime2) + 60;
        } else {
            diff2 = toTime2 - fromTime2 + 60;
        }

        if (fromTime3 > toTime3) {
            diff3 = totalTime - (fromTime3 - toTime3) + 60;
        } else {
            diff3 = toTime3 - fromTime3 + 60;
        }
        if (isNaN(diff2)) diff2 = 0;
        if (isNaN(diff3)) diff3 = 0;
        var total = diff1 + diff2 + diff3

        if (total > totalTime) {
            $scope.ErrorMsg = 'Total time shoud not greater than 24 hours.';
        }
        else {
            //Check From Time and To Time equal or not
            if (fromTime1 == toTime1)
                $scope.ErrorMsg = 'From Time and To Time should not equal for Shift1';
            if (fromTime2 == toTime2)
                $scope.ErrorMsg2 = 'From Time and To Time should not equal for Shift2';
            if (fromTime3 == toTime3)
                $scope.ErrorMsg3 = 'From Time and To Time should not equal for Shift3';

            if (isNaN(fromTime2) && !isNaN(toTime2))
                $scope.ErrorMsg2 = 'Please enter From Time for Shift2';
            if (!isNaN(fromTime2) && isNaN(toTime2))
                $scope.ErrorMsg2 = 'Please enter To Time for Shift2';
            if (isNaN(fromTime3) && !isNaN(toTime3))
                $scope.ErrorMsg3 = 'Please enter From Time for Shift3';
            if (!isNaN(fromTime3) && isNaN(toTime3))
                $scope.ErrorMsg3 = 'Please enter To Time for Shift3';

            if ($scope.ErrorMsg == '' && $scope.ErrorMsg2 == '' && $scope.ErrorMsg3 == '') {
                //For Shift1 and Shift2
                if ((fromTime2 <= toTime1 && fromTime2 >= fromTime1)
                    || (toTime2 <= toTime1 && toTime2 >= fromTime1)
                    || (fromTime1 <= toTime2 && fromTime1 >= fromTime2)
                    || (toTime1 <= toTime2 && toTime1 >= fromTime2))
                    $scope.ErrorMsg = 'Shift1 and Shift2 times are overlapped.';
                //For Shift1 and Shift3
                if ((fromTime3 <= toTime1 && fromTime3 >= fromTime1)
                    || (toTime3 <= toTime1 && toTime3 >= fromTime1)
                    || (fromTime1 <= toTime3 && fromTime1 >= fromTime3)
                    || (toTime1 <= toTime3 && toTime1 >= fromTime3))
                    $scope.ErrorMsg2 = 'Shift1 and Shift3 times are overlapped.';
                //For Shift2 and Shift3
                if ((fromTime3 <= toTime2 && fromTime3 >= fromTime2)
                    || (toTime3 <= toTime2 && toTime3 >= fromTime2)
                    || (fromTime2 <= toTime3 && fromTime2 >= fromTime3)
                    || (toTime2 <= toTime3 && toTime2 >= fromTime3))
                    $scope.ErrorMsg3 = 'Shift2 and Shift3 times are overlapped.';
            }
        }
        if ($scope.ErrorMsg != '' || $scope.ErrorMsg2 != '' || $scope.ErrorMsg3 != '')
            return false;
        return true;
    }

    //Save Shift Details for selected Company
    function SaveCompanyShift() {
        if (!ValidateShiftTime()) {
            angular.element('#idReqValidation').show();
            return;
        }
        CreateRequestObject();
        var data = JSON.stringify($scope.ShiftList);
        $http({
            method: "POST",
            url: "api/Admin/SaveShift",
            params: { requestParam: data }
        }).then(function (successData) {
            if (successData.status == 202) {
                $scope.ErrorMsg = successData.data;
                angular.element('#idReqValidation').show();
                return;
            }
            if (successData.data == 'Y') {
                $scope.Reset();
                $scope.SuccessMessage = 'Shift details saved successfully for selected company';
            }
        });
    }

    //Create Request List from scope variable
    function CreateRequestObject() {
        $scope.ShiftList[0] = { ShiftMasterId: $scope.Shift.ShiftMasterId1, CompanyId: $scope.CompanyId, ShiftNo: 1, FromTime: $scope.Shift.FromTime1, ToTime: $scope.Shift.ToTime1 }
        $scope.ShiftList[1] = { ShiftMasterId: $scope.Shift.ShiftMasterId2, CompanyId: $scope.CompanyId, ShiftNo: 2, FromTime: $scope.Shift.FromTime2, ToTime: $scope.Shift.ToTime2 }
        $scope.ShiftList[2] = { ShiftMasterId: $scope.Shift.ShiftMasterId3, CompanyId: $scope.CompanyId, ShiftNo: 3, FromTime: $scope.Shift.FromTime3, ToTime: $scope.Shift.ToTime3 }
    }

    //Create assign scope variable from List
    function ListToScopeVariable(shiftList) {

        //Clear all variable
        $scope.Shift.ShiftMasterId1 = 0;
        $scope.Shift.FromTime1 = "";
        $scope.Shift.ToTime1 = "";
        $scope.Shift.ShiftMasterId2 = 0;
        $scope.Shift.FromTime2 = "";
        $scope.Shift.ToTime2 = "";
        $scope.Shift.ShiftMasterId3 = 0;
        $scope.Shift.FromTime3 = "";
        $scope.Shift.ToTime3 = "";

        if (shiftList[0] != undefined) {
            $scope.Shift.ShiftMasterId1 = shiftList[0].ShiftMasterId;
            if (shiftList[0].FromTime != '' && shiftList[0].FromTime != null)
                $scope.Shift.FromTime1 = shiftList[0].FromTime.slice(0, 5);
            if (shiftList[0].ToTime != '' && shiftList[0].ToTime != null)
                $scope.Shift.ToTime1 = shiftList[0].ToTime.slice(0, 5);
        }
        if (shiftList[1] != undefined) {
            $scope.Shift.ShiftMasterId2 = shiftList[1].ShiftMasterId;
            if (shiftList[1].FromTime != '' && shiftList[1].FromTime != null)
                $scope.Shift.FromTime2 = shiftList[1].FromTime.slice(0, 5);
            if (shiftList[1].ToTime != '' && shiftList[1].ToTime != null)
                $scope.Shift.ToTime2 = shiftList[1].ToTime.slice(0, 5);
        }
        if (shiftList[2] != undefined) {
            $scope.Shift.ShiftMasterId3 = shiftList[2].ShiftMasterId;
            if (shiftList[2].FromTime != '' && shiftList[2].FromTime != null)
                $scope.Shift.FromTime3 = shiftList[2].FromTime.slice(0, 5);
            if (shiftList[2].ToTime != '' && shiftList[2].ToTime != null)
                $scope.Shift.ToTime3 = shiftList[2].ToTime.slice(0, 5);
        }
    }
}]);