/*
 * BluCloud S.r.l.
 * P.IVA 02176700512
 * ScuolaSemplice� is a registered trademark of BluCloud Srl
 *
 * ScuolaSemplice / purchasePacksController.js
 *
 * Copyright (C) 2015-2018 BluCloud S.r.l. - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Michele Mazzi <m.mazzi@blucloud.it>
 * http://www.scuolasemplice.it
 */
scuolasemplice.controller('companiesInvoicingController', function(dataFactory,CSRF_TOKEN,$scope,$q,$sce,$routeParams,$rootScope,$filter,$location) {    
    $scope.views = {};        
    $scope.views.listpayments = true;
    $scope.todaydate = new Date();
    $scope.firstload = true;
    $scope.userRole = $rootScope.dashboardData.role;
    $scope.customercompanies = null;
    $scope.companyinvoicing = false;
    $scope.datelimit = null;
    
    $scope.changeHourBillingDate = function(datelimit){
        $scope.datelimit = datelimit;
        $scope.loadChargableClasses();
    }
    
    $scope.clearInvoicingdata = function(){
        console.log("Ciao");
        $scope.invoicing = null;
    }
    
    $scope.fetchBillableCompanies = function() {
        $scope.companyinvoicing = false;
        var url = 'companiesinvoicing/listAll';
        $('.overlay, .loading-img').show(); 
        dataFactory.httpRequest(url).then(function(data) {
            $scope.customercompanies = data;
            if ($rootScope.havebillablecompanies == true){
                $scope.datelimit = $rootScope.billablecompaniesdate;
                angular.forEach($rootScope.billablecompanies, function(amount, companyid) {
                    angular.forEach($scope.customercompanies, function(inv, idx) {
                        if (companyid==inv.id){
                            inv.amount = amount;
                        }
                    });                    
                });
            }
            $('.overlay, .loading-img').hide();
        });
    }    
    
    $scope.$on('$viewContentLoaded', function(event) {
        $scope.fetchBillableCompanies();
    });    
    
    $scope.loadChargableCompanies = function(){
        $scope.companyinvoicing = false;
        $scope.companyinvoiceid = null;
        $scope.currcompany = null;        
        $scope.invoicing = null;
        var chain = $q.when();
        $('.overlay, .loading-img').show();
        var billablecount = 0;       
        var missingcunt = 0;
        $rootScope.billablecompanies = {};
        $scope.progress = 0;
        var donecount = 1;
        $scope.progress = Math.floor((donecount/$scope.customercompanies.length)*100 );
        angular.forEach($scope.customercompanies, function(inv, idx) {
            chain = chain.then(function() {
                inv.loading = true;
                console.log(inv);
                $scope.currentbverifystatus = "Verifica azienda ("+donecount+" su "+$scope.customercompanies.length+", "+$scope.progress+"%) "+inv.companyname+"...";
                var url = 'customercompanies/prepareinvoicing/'+inv.id+'/'+$scope.datelimit.replace("/", "-").replace("/", "-");                
                return dataFactory.httpRequest(url).then(function(data) {
                    data = successOrError(data);
                    inv.amount = 0;
                    if(data){                                           
                        
                        inv.amount = $scope.calculateTotalPreInvoicingAny(data);
                        $rootScope.billablecompanies[inv.id] = inv.amount;
                        if (isNaN(inv.amount)){
                            inv.amount = 0;
                        }
                        if (inv.amount>0){
                            billablecount++;
                        }
                        else if (inv.amount==-1){
                            missingcunt++;
                        }
                    }   
                    inv.loading = false;
                    donecount++;
                    $scope.progress = Math.floor(  (donecount/$scope.customercompanies.length)*100 );                    
                    if (idx === $scope.customercompanies.length - 1){ 
                        $('.overlay, .loading-img').hide();
                        $rootScope.havebillablecompanies = true;
                        $rootScope.billablecompaniesdate = $scope.datelimit;
                        $scope.currentbverifystatus = "";
                        var message = "";
                        if (billablecount==0){
                            message = $.scope.phrase.thereAreNoCompaniesThatCanBeBilledUnderTheCurrentContractualConditions;
                        }
                        else{
                            message = $scope.phrase.detectNumberCompaniesThatAreBillableUnderTheCurrentContractualConditions.replace('%s',billablecount);
                        }
                        if (missingcunt>0){
                            message += "<br>"+$scope.phrase.thereAreCompaniesWithBillingProblemsButWhoMayStillHaveAPartOfRegularlyBillableCourses.replace('%s',missingcunt);
                        }
                        swal({
                            title: $scope.phrase.verificationCompleted,
                            html: message
                        });
                    }
                });                                            
            });        
        });
    }
    
    $scope.calculateTotalPreInvoicingAny = function(invoicing){
        var invoicepretotal = 0;
        var conditionmissing = false;
        angular.forEach(invoicing.classes, function(inv, key1) {
            if (typeof inv.conditionmissing !== 'undefined' && inv.conditionmissing==1){
                conditionmissing = true;
                return;
            }
            angular.forEach(inv.invoicing, function(event, key1) {    
                if (event.key=='subscr'){
                    angular.forEach(inv.students, function(student, key1) {
                        if (student.invoicing.subscr_invdone==0){
                            if (!isNaN(student.invoicing.subscr)){
                                invoicepretotal += student.invoicing.subscr;
                            }
                        }
                    });
                }
                else if (event.key=='books'){
                    angular.forEach(inv.students, function(student, key1) {
                        if (student.nomaterial==0 && student.invoicing.books_invdone==0){
                            if (!isNaN(student.invoicing.books)){
                                invoicepretotal += student.invoicing.books;    
                            }
                        }
                    });
                }                    
                else if (event.key=='travels' || event.key=='hours'){
                    if (!event.missing){
                        if (!isNaN(event.what)){
                            invoicepretotal += event.what;
                        }
                    }
                }
                else{
                    if (inv.paymenttype=='class'){
                        var key = event.key+'_invdone';
                        if (event[key]==0){
                            invoicepretotal += event[event.key];
                        }                            
                    }
                    else{                            
                        if (inv.students.length==1){
                            var key = event.key+'_invdone';
                            if (inv.students[0].invoicing[key]==0){
                                invoicepretotal += inv.students[0].invoicing[event.key];
                            }
                        }
                        else{
                            angular.forEach(inv.students, function(student, key1) {
                                var key = event.key+'_invdone';
                                if (student.invoicing[key]==0){                                
                                    invoicepretotal += student.invoicing[event.key];
                                }
                            });                            
                        }
                    }
                }
            });
        });
        if (invoicepretotal==0 && conditionmissing==true) return -1;
        var invoicetotal = Math.round(invoicepretotal * 100) / 100;
        invoicetotal = invoicetotal.toFixed(2);
        return invoicetotal;
    }    
    
    $scope.calculateTotalInvoicing = function(){
        $scope.invoicenottotal = 0;
        angular.forEach($scope.invoicingrows, function(po, key1) {
            angular.forEach(po.rows, function(value, key2) {
                if (!isNaN(parseFloat(value.amount))){
                    $scope.invoicenottotal += parseFloat(value.amount);
                }
            });
        });         
        $scope.invoicenottotal = Math.round($scope.invoicenottotal * 100) / 100;
        $scope.invoicenottotal = $scope.invoicenottotal.toFixed(2);
        $scope.invoicenottotal+= ' Euro';
    }    
    
    $scope.goInvoiceCompany = function(company){
        $scope.companyinvoicing = true;
        $scope.companyinvoiceid = company.id;
        $scope.invoicingdata = angular.copy(company);
        $scope.currcompany = company;
        $scope.currcompany.datelimit = angular.copy($scope.datelimit);
        $scope.loadChargableClasses();
    }
    
    $scope.removeInvoicingRow = function(rows, $index){
        rows.splice($index, 1);
    }
    
    $scope.addInvoicingRow = function(rows, $index){
        rows.push({"classid": null, 
                    "manual": true,
                    "placeholder": "Usare per inserire manualmente una voce in fattura", 
                    "text": "", 
                    "what": "", 
                    "amount": ""});
    }
    
    $scope.confirmPOChange = function(classid, student){
        $('.overlay, .loading-img').show();
        var param = {'subscriptionid': student.subscriptionid, 'newpo': student.newponumber};
        dataFactory.httpRequest('customercompanies/chagestudentpo','POST',{},param).then(function(data) {
            content = successOrError(data);
            if(content){
                if (content.success==1){
                    $scope.loadChargableClasses();
                }
                else{
                    swal({
                        'text': $scope.phrase.unablePurchaseOrderAbnormalConditionMessage,
                        'type': 'warning'
                    })
                }
            }
            $('.overlay, .loading-img').hide();
        });        
    }
    
    $scope.confirmSinglePOChange = function(newponumber, studentid){
        $('.overlay, .loading-img').show();
        var param = {'subscriptionid': studentid.subscriptionid, 'newpo': newponumber};
        dataFactory.httpRequest('customercompanies/chagestudentpo','POST',{},param).then(function(data) {
            content = successOrError(data);
            if(content){
                if (content.success==1){
                    $scope.loadChargableClasses();
                }
                else{
                    swal({
                        'text': $scope.phrase.unablePurchaseOrderAbnormalConditionMessage,
                        'type': 'warning'
                    })
                }
            }
            $('.overlay, .loading-img').hide();
        }); 
    }
    
    $scope.getInvoicingTemplate = function(){
        if ($rootScope.dashboardData.production){
            return '/templates.' + $rootScope.dashboardData.version + '/company.invoicing.html';
        }
        else{
            return '/templates/company.invoicing.html';
        }
    }    
    
    $scope.recalculare = function(company){
        company.loading = true;
        var url = 'customercompanies/prepareinvoicing/'+company.id+'/'+$scope.datelimit.replace("/", "-").replace("/", "-");                
        $('.overlay, .loading-img').show();
        dataFactory.httpRequest(url).then(function(data) {            
            data = successOrError(data);
            if(data){                                           
                company.amount = $scope.calculateTotalPreInvoicingAny(data);
                $rootScope.billablecompanies[company.id] = company.amount;
            }   
            company.loading = false;
            $('.overlay, .loading-img').hide();
        });                 
    }
    
    $scope.loadChargableClasses = function(){
        var url = 'customercompanies/prepareinvoicing/'+$scope.currcompany.id+'/'+$scope.datelimit.replace("/", "-").replace("/", "-");
        $('.overlay, .loading-img').show();
        dataFactory.httpRequest(url).then(function(data) {
            data = successOrError(data);
            if(data){
                $scope.editconditions = false;
                $scope.invoicingready = false;
                $scope.invoicingrows = null;                    
                $scope.showchargables = true;
                $scope.invoicing = data;
                $scope.showhoursperiodend = false;
                $scope.currentcompanyname = data.companyname;
                $scope.hasinvoicing = data.hasinvoicing;
                if ($scope.hasinvoicing==0){                    
                    swal({
                        title: $filter('sprintf')($scope.phrase.noBillingAddress, data.companyname),
                        type: 'warning'
                    })
                }
                angular.forEach($scope.invoicing.classes, function(inv, key) {
                    if (inv.paymenttype=='hours'){
                        $scope.showhoursperiodend = true;
                    }
                });
                $scope.calculateTotalPreInvoicing();
            }   
            $('.overlay, .loading-img').hide();
        });        
    }  
    
    $scope.selectAllInvoiceRows = function(checkall, checkbox){
        $scope.selectingAllSelected = false;
        angular.forEach($scope.invoicing.classes, function(inv, key) {
            angular.forEach(inv.invoicing, function(event, key) {    
                if (typeof inv.conditionmissing === 'undefined' || inv.conditionmissing==0){
                    if (checkall){
                        event.goinvoice = '1';
                    }
                    else{
                        event.goinvoice = '0';
                    }
                }
            });
        });    
        $scope.calculateTotalPreInvoicing();
    }
    
    $scope.classReactiveInvoicingEvent = function(course, event, studentid){
        swal({
          title: $scope.phrase.billingReinstatement,
          text: $filter('sprintf')($scope.phrase.restoreBillingForCourseclassEvent,course.className,event.when),
          type: 'question',
          showCancelButton: true,
          confirmButtonColor: $rootScope.confirmButtonColor,
          confirmButtonText: $scope.phrase.Continue,
          cancelButtonText: $scope.phrase.Cancel
        }).then(function(){
            $('.overlay, .loading-img').show();
            var param = {'classid': course.id, 'companyid': $scope.currcompany.id, 'ignorekey': event.key, 'paymenttype': course.paymenttype};
            if (typeof studentid !== 'undefined'){
                param.studentid = studentid;
            }
            if (event.key=='hours' || event.key=='travels'){
                param.date = event.date;
                if (typeof event.datefrom !== 'undefined'){
                    param.datefrom = event.datefrom;
                }
            }
            dataFactory.httpRequest('customercompanies/redopartinvoicing','POST',{},param).then(function(data) {
                content = successOrError(data);
                if(content){
                    if (content.success==1){
                        $scope.loadChargableClasses();
                    }
                    else{
                        swal({
                            'text': $scope.phrase.unableToPerformTheOperationAbnormalConditionCheckWithTheAsistance,
                            'type': 'warning'
                        })
                    }
                }
                $('.overlay, .loading-img').hide();
            });        
        }).catch(swal.noop);        
    }
    
    $scope.classIgnoreInvoicingEvent = function(course, event, studentid){
        swal({
          title: $scope.phrase.ignoreBilling,
          text: $filter('sprintf')($scope.phrase.doYouConfirmThatYouWantToIgnoreBillingForCourseClassEvent,course.className,event.when),
          type: 'question',
          showCancelButton: true,
          confirmButtonColor: $rootScope.confirmButtonColor,
          confirmButtonText: $scope.phrase.Continue,
          cancelButtonText: $scope.phrase.Cancel
        }).then(function(){
            $('.overlay, .loading-img').show();
            var param = {'classid': course.id, 'companyid': $scope.currcompany.id, 'ignorekey': event.key, 'paymenttype': course.paymenttype};
            if (typeof studentid !== 'undefined'){
                param.studentid = studentid;
            }
            if (event.key=='hours' || event.key=='travels'){
                param.date = event.date;
                if (typeof event.datefrom !== 'undefined'){
                    param.datefrom = event.datefrom;
                }
            }
            dataFactory.httpRequest('customercompanies/ignorepartinvoicing','POST',{},param).then(function(data) {
                content = successOrError(data);
                if(content){
                    if (content.success==1){
                        $scope.loadChargableClasses();
                    }
                    else{
                        swal({
                            'text': $scope.phrase.unableToPerformTheOperationAbnormalConditionCheckWithTheAsistance,
                            'type': 'warning'
                        })
                    }
                }
                $('.overlay, .loading-img').hide();
            });        
        }).catch(swal.noop);        
    }
    
    $scope.classIgnoreInvoicing = function(course){
        swal({
          title: $scope.phrase.ignoreBilling,
          text: $filter('sprintf')($scope.phrase.doYouConfirmThatYouWantToIgnoreBillingForCourseClassEvent,course.className, ' '),
          type: 'question',
          showCancelButton: true,
          confirmButtonColor: $rootScope.confirmButtonColor,
          confirmButtonText: $scope.phrase.Continue,
          cancelButtonText: $scope.phrase.Cancel
        }).then(function(){
            $('.overlay, .loading-img').show();
            var param = {'classid': course.id, 'companyid': $scope.currcompany.id};
            dataFactory.httpRequest('customercompanies/ignoreinvoicing','POST',{},param).then(function(data) {
                content = successOrError(data);
                if(content){
                    if (content.success==1){
                        $scope.loadChargableClasses();
                    }
                    else{
                        swal({
                            'text': $scope.phrase.unableToPerformTheOperationAbnormalConditionCheckWithTheAsistance,
                            'type': 'warning'
                        })
                    }
                }
                $('.overlay, .loading-img').hide();
            });        
        }).catch(swal.noop);        
    }    
    
    $scope.calculateTotalPreInvoicing = function(){
        $scope.invoicepretotal = 0;
        angular.forEach($scope.invoicing.classes, function(inv, key1) {
            angular.forEach(inv.invoicing, function(event, key1) {    
                if (event.goinvoice==1){
                    if (event.key=='subscr'){
                        angular.forEach(inv.students, function(student, key1) {
                            if (student.invoicing.subscr_invdone==0){
                                $scope.invoicepretotal += student.invoicing.subscr;
                            }
                        });
                    }
                    else if (event.key=='books'){
                        angular.forEach(inv.students, function(student, key1) {
                            if (student.nomaterial==0 && student.invoicing.books_invdone==0){
                                $scope.invoicepretotal += student.invoicing.books;    
                            }
                        });
                    }                    
                    else if (event.key=='travels' || event.key=='hours'){
                        if (!event.missing){
                            $scope.invoicepretotal += event.what;
                        }
                    }
                    else{
                        if (inv.paymenttype=='class'){
                            var key = event.key+'_invdone';
                            if (event[key]==0){
                                $scope.invoicepretotal += event[event.key];
                            }                            
                        }
                        else{                            
                            if (inv.students.length==1){
                                var key = event.key+'_invdone';
                                if (inv.students[0].invoicing[key]==0){
                                    $scope.invoicepretotal += inv.students[0].invoicing[event.key];
                                }
                            }
                            else{
                                angular.forEach(inv.students, function(student, key1) {
                                    var key = event.key+'_invdone';
                                    if (student.invoicing[key]==0){                                
                                        $scope.invoicepretotal += student.invoicing[event.key];
                                    }
                                });                            
                            }
                        }
                    }
                }
            });
        });
        $scope.invoicepretotalraw = $scope.invoicepretotal;
        $scope.invoicepretotal = Math.round($scope.invoicepretotal * 100) / 100;
        $scope.invoicepretotal = $scope.invoicepretotal.toFixed(2);        
        $scope.invoicepretotal+= ' Euro';
    }    
    
    $scope.classUnignoreInvoicing = function(course){
        swal({
          title: $scope.phrase.billingReinstatement,
          text: restoreBillingForCourseclassEvent.replace('%c',course.className).replace('%e',' ').replace(',',' '),
          type: 'question',
          showCancelButton: true,
          confirmButtonColor: $rootScope.confirmButtonColor,
          confirmButtonText: $scope.phrase.Continue,
          cancelButtonText: $scope.phrase.Cancel
        }).then(function(){
            $('.overlay, .loading-img').show();
            var param = {'classid': course.id, 'companyid': $scope.currcompany.id};
            dataFactory.httpRequest('customercompanies/unignoreinvoicing','POST',{},param).then(function(data) {
                content = successOrError(data);
                if(content){
                    if (content.success==1){
                        $scope.loadChargableClasses();
                    }
                    else{
                        swal({
                            'text': $scope.phrase.unableToPerformTheOperationAbnormalConditionCheckWithTheAsistance,
                            'type': 'warning'
                        })
                    }
                }
                $('.overlay, .loading-img').hide();
            });        
        }).catch(swal.noop);        
    }    
    
    $scope.classArchiveInvoicing = function(course){
        swal({
          title: $scope.phrase.finalCourseHding,
          text: $scope.phrase.permanentlyIgnoreBillingForTheCourse.replace('%s',course.className),
          type: 'question',
          showCancelButton: true,
          confirmButtonColor: $rootScope.confirmButtonColor,
          confirmButtonText: $scope.phrase.Continue,
          cancelButtonText: $scope.phrase.Cancel
        }).then(function(){
            $('.overlay, .loading-img').show();
            var param = {'classid': course.id, 'companyid': $scope.currcompany.id};
            dataFactory.httpRequest('customercompanies/archiveclassinvoicing','POST',{},param).then(function(data) {
                content = successOrError(data);
                if(content){
                    if (content.success==1){
                        $scope.loadChargableClasses();
                    }
                    else{
                        swal({
                            'text': $scope.phrase.unableToPerformTheOperationAbnormalConditionCheckWithTheAsistance,
                            'type': 'warning'
                        })
                    }
                }
                $('.overlay, .loading-img').hide();
            });        
        }).catch(swal.noop);
    }
    
    $scope.getStudentPrice = function(student, when){
        return student.invoicing[when];
    }    
    
    $scope.prepareInvoiceRows = function(){
        $('.overlay, .loading-img').show();
        dataFactory.httpRequest('customercompanies/prepareinvoicerows/'+$scope.currcompany.id,'POST',{},$scope.invoicing.classes).then(function(data) {
            data = successOrError(data);
            if(data){
                $scope.invoicingready = true;
                $scope.invoicingrows = data;
                angular.forEach($scope.invoicingrows, function(po, key) {
                    var totlen = 0;
                    if (typeof po.defcompanies!=='undefined'){
                        totlen+=po.defcompanies.length;
                    }
                    if (typeof po.othercompanies!=='undefined'){
                        totlen+=po.othercompanies.length;
                    }
                    if (totlen>1){//Devo scegliere un account
                        if (typeof po.defcompanies!=='undefined'){
                            angular.forEach(po.defcompanies, function(account, key1) {
                                if (account.predefined==1){
                                    po.selectedaccount = account.id+'-'+account.accountid;
                                    $scope.changedDebitAccount(po);
                                }
                            });
                        }
                    }
                });
                $scope.calculateTotalInvoicing();
            }
            $('.overlay, .loading-img').hide();
        });
    }
    
    $scope.selectAllInvoiceRows = function(checkall, checkbox){
        $scope.selectingAllSelected = false;
        angular.forEach($scope.invoicing.classes, function(inv, key) {
            angular.forEach(inv.invoicing, function(event, key) {    
                if (typeof inv.conditionmissing === 'undefined' || inv.conditionmissing==0){
                    if (checkall){
                        event.goinvoice = '1';
                    }
                    else{
                        event.goinvoice = '0';
                    }
                }
            });
        });    
        $scope.calculateTotalPreInvoicing();
    }
    
    $scope.changedDebitAccount = function(purchaseorder){
        var fields = purchaseorder.selectedaccount.split('-');
        var company = fields[0];
        var accountid = fields[1];
        var found = false;
        if (typeof purchaseorder.defcompanies!=='undefined'){
            angular.forEach(purchaseorder.defcompanies, function(account, key1) {
                if (account.id==company && account.accountid==accountid){
                    purchaseorder.emissionmindate = account.lastemission;                    
                    found = true;
                }
            });
        }
        if (found == false && typeof purchaseorder.othercompanies!=='undefined'){
            angular.forEach(purchaseorder.othercompanies, function(account, key1) {
                if (account.id==company && account.accountid==accountid){
                    purchaseorder.emissionmindate = account.lastemission;
                    found = true;
                }
            });
        }        
    }
    
    $scope.cofirmEmitInvoices = function(){        
        var discounterror = false;
        var accounterror = false;
        angular.forEach($scope.invoicingrows, function(po, key) {
            if (typeof po.emissiondate === 'undefined' || po.emissiondate==""){
                swal({
                    'text': $scope.phrase.attentionPleaseSelectTheDateOfIssueOfTheInvoices,
                    'type': "warning"
                });
                accounterror = true;
                return;                
            }
            angular.forEach(po.rows, function(row, key) {    
                if (row.amount>row.what){
                    discounterror = true;
                }
            });
            var totlen = 0;
            if (typeof po.defcompanies!=='undefined'){
                totlen+=po.defcompanies.length;
            }
            if (typeof po.othercompanies!=='undefined'){
                totlen+=po.othercompanies.length;
            }            
            if (totlen>1){//Devo scegliere un account
                if (typeof po.selectedaccount === 'undefined' || !po.selectedaccount>0){
                    swal({
                        'text': $scope.phrase.attentionPleaseSelectForeachPurchaseOrderTheAccountOnWhichYouWantToCreditTheInvoice,
                        'type': "warning"
                    });
                    accounterror = true;
                    return;
                }
            }
        });
        if (accounterror){
            return;
        }
        if (discounterror){
            swal({
                'text': $scope.phrase.attentionTouCannotIndicateASicountedValueHigherTheOriginalCost,
                'type': "warning"
            });
            return;
        }
        swal({
          title: $scope.phrase.confirmInvoiceIssue,
          text: $scope.phrase.doYouConfirmThatYouWantToIssueTheInvoicesInQuestionForCompany.replace('%s',$scope.currcompany.companyname),
          type: 'question',
          showCancelButton: true,
          confirmButtonColor: $rootScope.confirmButtonColor,
          confirmButtonText: $scope.phrase.Continue,
          cancelButtonText: $scope.phrase.Cancel
        }).then(function(){
            $('.overlay, .loading-img').show();
            dataFactory.httpRequest('customercompanies/emitcompanyinvoices/'+$scope.currcompany.id,'POST',{},$scope.invoicingrows).then(function(data) {
                data = successOrError(data);
                if(data){
                    swal({
                        title: $scope.phrase.invoicesIssuedSuccessfully,
                        text: $scope.phrase.invoicesAvailableTaxmanagementInovoiceCreditNotesSection
                    });
                    $scope.gobackToList($scope.datelimit);
                }
                $('.overlay, .loading-img').hide();
            });
        }).catch(swal.noop);                
    }
    
    $scope.gobackToList = function(datelimit){
        $scope.companyinvoicing = false;
        $scope.companyinvoiceid = null;
        $scope.invoicing = null;
        $scope.currcompany.loading = true;
        if (!$scope.invoicingfromsinglecompany){
            var url = 'customercompanies/prepareinvoicing/'+$scope.currcompany.id+'/'+datelimit.replace("/", "-").replace("/", "-");                
            $('.overlay, .loading-img').show();
            dataFactory.httpRequest(url).then(function(data) {            
                data = successOrError(data);
                if(data){                                           
                    $scope.currcompany.amount = $scope.calculateTotalPreInvoicingAny(data);
                    $rootScope.billablecompanies[$scope.currcompany.id] = $scope.currcompany.amount;
                }   
                $scope.currcompany.loading = false;
                $scope.currcompany = null;
                $('.overlay, .loading-img').hide();
            });
        }
        else{        
            $scope.loadChargableClasses();
        }
        /*
        var url = 'customercompanies/prepareinvoicing/'+$scope.currcompany.id+'/'+datelimit.replace("/", "-").replace("/", "-");                
        $('.overlay, .loading-img').show();
        dataFactory.httpRequest(url).then(function(data) {            
            data = successOrError(data);
            if(data){                                           
                $scope.currcompany.amount = $scope.calculateTotalPreInvoicingAny(data);
                $rootScope.billablecompanies[$scope.currcompany.id] = $scope.currcompany.amount;
            }   
            $scope.currcompany.loading = false;
            $scope.currcompany = null;
            $('.overlay, .loading-img').hide();
        });   
        */
    }
    
    $scope.changesQta = function(po, row){
        row.what = row.qta * row.unitprice;
        row.amount = row.what;
        
        var totwhat = 0;
        var totamount = 0;
        angular.forEach(po.rows, function(value, key) {
            totwhat+=value.what;
            totamount+=value.amount;
        });
        po.totalwhat = totwhat;
        po.total = totamount;
        $scope.calculateTotalInvoicing();
    }    
    
    $scope.changedWhat = function(po, row){
        row.amount = row.what;
        var totwhat = 0;
        var totamount = 0;
        angular.forEach(po.rows, function(value, key) {
            totwhat+=value.what;
            totamount+=value.amount;
        });
        po.totalwhat = totwhat;
        po.total = totamount;
        $scope.calculateTotalInvoicing();
    }
    
    $scope.changedAmount = function(po, row){
        var totamount = 0;
        $scope.invoicenottotal = 0;
        angular.forEach(po.rows, function(value, key) {
            totamount+=value.amount;
        });
        po.total = totamount;
        $scope.calculateTotalInvoicing();
    }    
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.listpayments = false;
        $scope.views[view] = true;
    }    
    
});