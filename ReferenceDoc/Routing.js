'use strict';
app.config(['$locationProvider', '$routeProvider','$cookiesProvider',
   function ($locationProvider, $routeProvider, $cookiesProvider) {
       $locationProvider.html5Mode({ enabled: true, requireBase: false }).hashPrefix('!');
       $cookiesProvider.defaults.path = '/';
       $routeProvider
       .when('/Logout', { templateUrl: '/Login/LogoutUser', controller: 'LogoutController' })
       .when('/WelcomeScreen', { title: 'Thermochem', templateUrl: '/WelcomeScreen/WelcomeScreen', controller: 'MenuController' })

       .when('/Backup', { title: 'Thermochem', templateUrl: '/Admin/AutoBackupSettings', controller: 'AutoBackupSettingsController' })
       .when('/SystemSettings', { title: 'Thermochem', templateUrl: '/Admin/SystemSettings', controller: 'SystemSettingsController' })
       .when('/UserMaster', { title: 'Thermochem', templateUrl: '/Admin/UserMaster', controller: 'UserMasterController' })
       .when('/RoleMaster', { title: 'Thermochem', templateUrl: '/Admin/RoleMaster', controller: 'RoleMasterController' })
       .when('/RightsAssignment', { title: 'Thermochem', templateUrl: '/Admin/RightsAssignment', controller: 'RightsAssignmentController' })
       .when('/ActivateLicense', { title: 'Thermochem', templateUrl: '/Admin/ActivateLicense', controller: 'ActivateLicenseController' })
       .when('/FurnanceMaster', { title: 'Thermochem', templateUrl: '/Admin/FurnanceMaster', controller: 'FurnanceMasterController' })
       .when('/RecipeMaster', { title: 'Thermochem', templateUrl: '/Admin/RecipeMaster', controller: 'RecipeMasterController' })
        
       .when('/ManualBackup', { title: 'Thermochem', templateUrl: '/BackupRestore/ManualBackup', controller: 'ManualBackupController' })
       .when('/Restore', { title: 'Thermochem', templateUrl: '/BackupRestore/RestoreDatabase', controller: 'RestoreDatabaseController' })

        .when('/ReportSummary', { title: 'Thermochem', templateUrl: '/Reports/ReportSummary', controller: 'ReportSummaryController' })
        .when('/ProcessReport', { title: 'Thermochem', templateUrl: '/Reports/ProcessReport', controller: 'ProcessReportController' })
        .when('/EnergyReport', { title: 'Thermochem', templateUrl: '/Reports/EnergyReport', controller: 'EnergyReportController' })
        .when('/AlarmReport', { title: 'Thermochem', templateUrl: '/Reports/AlarmReport', controller: 'AlarmReportController' })
        .when('/EventReport', { title: 'Thermochem', templateUrl: '/Reports/EventReport', controller: 'EventReportController' })
        
        .when('/Dashboard', { title: 'Thermochem', templateUrl: '/CurrentStatus/Dashboard', controller: 'DashboardController' })
        .when('/CurrentStatus', { title: 'Thermochem', templateUrl: '/CurrentStatus/CurrentStatus', controller: 'CurrentStatusController' })

       .otherwise({ controller: 'ErrorController' })
   }]);