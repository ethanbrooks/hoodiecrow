'use strict';

//
// Constants
//

var NOTIFICATION_SENT_TIMEOUT = 2000;


//
// Controller
//

var NavigationCtrl = function($scope, $location, $q, $timeout, account, email, outbox, notification, status, appConfig, dialog, dummy, axe) {
    if (!$location.search().dev && !account.isLoggedIn()) {
        $location.path('/'); // init app
        return;
    }

    var str = appConfig.string,
        config = appConfig.config;

    //
    // scope state
    //

    $scope.state.nav = {
        open: false,
        toggle: function(to) {
            this.open = to;
        }
    };

    //
    // url/history handling
    //

    $scope.loc = $location;

    /**
     * Close read mode and go to folder
     */
    $scope.navigate = function(folderIndex) {
        $location.search('id', null); // close the read mode
        $location.search('folder', folderIndex); // open the n-th folder
    };

    // folder index url watcher
    $scope.$watch('(loc.search()).folder', function(folderIndex) {
        if (!$scope.account.folders || !$scope.account.folders.length) {
            // there's no folder to navigate to
            return;
        }

        // normalize folder index to [0 ; $scope.account.folders.length - 1]
        folderIndex = parseInt(folderIndex, 10);
        if (isNaN(folderIndex) || folderIndex < 0 || folderIndex > ($scope.account.folders.length - 1)) {
            // array index out of bounds or nonsensical data
            $location.search('folder', 0);
            return;
        }

        // navigate to folder[folderIndex]
        // navigate to the selected folder index
        $scope.state.nav.currentFolder = $scope.account.folders[folderIndex];
        $scope.state.nav.toggle(false);
    });

    // nav open/close state url watcher
    $scope.$watch('(loc.search()).nav', function(open) {
        // synchronize the url to the scope state
        $scope.state.nav.toggle(!!open);
    });
    $scope.$watch('state.nav.open', function(value) {
        // synchronize the scope state to the url
        $location.search('nav', value ? true : null);
    });

    // lightbox state url watcher
    $scope.$watch('(loc.search()).lightbox', function(value) {
        // synchronize the url to the scope state
        $scope.state.lightbox = (value) ? value : undefined;
    });
    $scope.$watch('state.lightbox', function(value) {
        // synchronize the scope state to the url
        $location.search('lightbox', value ? value : null);
    });

    //
    // scope functions
    //

    $scope.onOutboxUpdate = function(err) {
        if (err) {
            axe.error('Sending from outbox failed: ' + err.message);
            status.update('Error sending messages...');
        }

        // update the outbox mail count
        var ob = _.findWhere($scope.account.folders, {
            type: config.outboxMailboxType
        });

        if (!ob) {
            // the outbox folder has not been initialized yet
            return;
        }

        return $q(function(resolve) {
            resolve();

        }).then(function() {
            return email.refreshOutbox();

        }).catch(dialog.error);
    };

    $scope.logout = function() {
        return dialog.confirm({
            title: str.logoutTitle,
            message: str.logoutMessage,
            callback: function(confirm) {
                if (confirm) {
                    account.logout().catch(dialog.error);
                }
            }
        });
    };

    //
    // Start
    //

    // init folders
    initializeFolders();

    // connect gmail client on first startup
    account.onConnect(function(err) {
        if (err) {
            dialog.error(err);
            return;
        }

        // select inbox if not yet selected
        if (!$scope.state.nav.currentFolder) {
            $timeout(function() {
                $scope.navigate(0);
            });
        }
    });

    //
    // helper functions
    //

    function initializeFolders() {
        // create dummy folder in dev environment only
        if ($location.search().dev) {
            $scope.$root.account = {};
            $scope.account.folders = dummy.listFolders();
            return;
        }

        // get pointer to account/folder/message tree on root scope
        $scope.$root.account = account.list()[0];

        // set notificatio handler for sent messages
        outbox.onSent = function(message) {
            notification.create({
                title: 'Message sent',
                message: message.subject,
                timeout: NOTIFICATION_SENT_TIMEOUT
            }, function() {});
        };

        // start checking outbox periodically
        outbox.startChecking($scope.onOutboxUpdate);
    }
};

module.exports = NavigationCtrl;