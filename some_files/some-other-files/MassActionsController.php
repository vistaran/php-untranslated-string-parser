<?php
/*
 * BluCloud S.r.l.
 * P.IVA 02176700512
 * ScuolaSemplice® is a registered trademark of BluCloud Srl
 *
 * ScuolaSemplice / purchasePacksController.php
 *
 * Copyright (C) 2015-2017 BluCloud S.r.l. 2015-2018 - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Michele Mazzi <m.mazzi@blucloud.it>
 * http://www.scuolasemplice.it
 */
class MassActionsController extends \BaseController {
    var $data = array();
    var $panelInit ;
    var $layout = 'dashboard';
    var $tablelessons = 'classListOfLessons';
	
    public function __construct(){
        parent::__construct();
        if (isset($_COOKIE['pagesize'])){
            $this->pagesize = $_COOKIE['pagesize'];
        }        
    }
	
    public function listAll($page = 1){
        $toReturn = array();
        $toReturn['pageSize'] = $this->pagesize;
        $query = jobscheduled::where('canceled', '=', 0)->orderBy('scheduledate', 'desc');
        $toReturn['totalItems'] = $query->count();
        $packs = $query->take($this->pagesize)->skip($this->pagesize * ($page - 1) )->orderBy('id', 'desc')->get()->toArray();
        $toReturn['jobactions'] = $packs;
        return $toReturn;
    }
    
    public function prepareAction(){
        $action = Input::get('action');
        if ($action=='nextWeekTimetablesNotifications'){            
            $wd = date('w', time());
            if ($wd==0){
                $diff = 1;
                $diffback = 6;
            }
            else{
                $diff = 8-$wd;
                $diffback = $wd-1;
            }
            $data = array();
            $data['periods'] = array();
            $dateback = new DateTime();
            $dateback->sub(new DateInterval("P{$diffback}D"));
            $monday = $dateback->format('Y-m-d');
            $dateback->add(new DateInterval("P6D"));
            $sunday = $dateback->format('Y-m-d');
            $startday = date('d/M/Y', strtotime($monday));
            $endday = date('d/M/Y', strtotime($sunday));                        
            $data['periods'][$monday] = "Report dal $startday al $endday";
            $date = new DateTime();
            $date->add(new DateInterval("P{$diff}D"));
            $monday = $date->format('Y-m-d');
            $date->add(new DateInterval("P6D"));
            $sunday = $date->format('Y-m-d');
            $startday = date('d/M/Y', strtotime($monday));
            $endday = date('d/M/Y', strtotime($sunday));            
            $data['periods'][$monday] = "Report dal $startday al $endday";
            for ($i=1; $i<8; $i++){
                $date->add(new DateInterval("P1D"));
                $monday = $date->format('Y-m-d');            
                $date->add(new DateInterval("P6D"));
                $sunday = $date->format('Y-m-d');                
                
                $startday = date('d/M/Y', strtotime($monday));
                $endday = date('d/M/Y', strtotime($sunday));                
                $data['periods'][$monday] = "Report dal $startday al $endday";
            }
            
            if (Input::has('period')){
                /*
                $wd = date('w', time());
                if ($wd==0)
                    $diff = 1;
                else
                    $diff = 8-$wd;            
                $date = new DateTime();
                $date->add(new DateInterval("P{$diff}D"));                
                */
                $date = new DateTime(Input::get('period'));

                $monday = $date->format('Y-m-d');
                $date->add(new DateInterval("P6D"));
                $sunday = $date->format('Y-m-d');
                $m = "$monday 00:00:00";
                $s = "$sunday 23:59:59";
                $teachers = User::distinct()->join('lessons', 'users.id', '=', 'lessons.teacherid')
                                                ->where('role', 'teacher')
                                                ->where('lessons.starttime', '>=', $m)
                                                ->where('lessons.starttime', '<=', $s)
                                                ->where('lessons.isholiday', '=', 0)
                                                ->where('lessons.canceled', '=', 0)
                                                ->orderby('users.fullName')
                                                ->get(array('users.id', 'users.fullName', 'users.name', 'users.surname', 'users.email'));
                $startday = date('d/M/Y', strtotime($monday));
                $endday = date('d/M/Y', strtotime($sunday));
                $data['teachers'] = [];
                foreach ($teachers as $teacher) {                
                    //se l'utente può ricevere la mail
                    if ($teacher->email && $teacher->email != ''){
                        $teacherobj = User::where('id', $teacher->id)->where('role', 'teacher')->first();
                        if ($teacherobj){
                            $data['teachers'][] = array("id" => $teacher->id, "label" => "Invio Timetable a docente {$teacherobj->fullName}({$teacherobj->email}) periodo $startday - $endday");
                        }
                    }
                }        
            }
            return array('success' => 1, 'data' => $data);
        }
    }
    
    public function runAction(){
        $action = Input::get('action');
        if ($action=='nextWeekTimetablesNotifications'){
            /* teachers */
            $monday = Input::get('selectedperiod');
            $date = new DateTime($monday);
            $date->add(new DateInterval("P6D"));
            $sunday = $date->format('Y-m-d');
            
            $teachlist = Input::get('selectedteacher');
            $ids = array();
            foreach ($teachlist as $teacherid => $selected){
                if ($selected==1){
                    $ids[] = $teacherid;                
                }
            }

            $m = "$monday 00:00:00";
            $s = "$sunday 23:59:59";
            $teachers = User::whereIn('users.id', $ids)->where('users.role', '=', 'teacher')
                            ->get(array('users.id', 'users.fullName', 'users.name', 'users.surname', 'users.email'));
            
            /*
            $teachers = User::distinct()->join('lessons', 'users.id', '=', 'lessons.teacherid')
                                            ->where('role', 'teacher')
                                            ->where('lessons.starttime', '>=', $m)
                                            ->where('lessons.starttime', '<=', $s)
                                            ->orderby('users.fullName')
                                            ->get(array('users.id', 'users.fullName', 'users.name', 'users.surname', 'users.email'));
            */
            $startday = date('d/M/Y', strtotime($monday));
            $endday = date('d/M/Y', strtotime($sunday));
            foreach ($teachers as $teacher) {                
                //se l'utente può ricevere la mail
                if ($teacher->email && $teacher->email != ''){
                    $teacherobj = User::where('id', $teacher->id)->where('role', 'teacher')->first();
                    if ($teacherobj){
                        $jobscheduled = new jobscheduled();
                        $jobscheduled->scheduledate = $this->current_db_datetime();
                        $jobscheduled->description ="Invio Timetable a docente {$teacherobj->fullName}({$teacherobj->email}) periodo $startday-$endday";
                        $jobscheduled->service="TimetableServices";
                        $jobscheduled->method="sendTimetableToTeacher";
                        //$jobscheduled->parameters=json_encode(array("teacherid" => $teacher->id, 'reportdate' => date('Y-m-d', $monday)));
                        $jobscheduled->parameters=json_encode(array("teacherid" => $teacher->id, 'reportdate' => $monday));
                        $jobscheduled->save();
                    }
                }
            }        
            return json_encode(array('success' => 1, 'jsTitle' => "Invio settimanale timetable", 'Schedulazione avvenuta' => "La schedulazione settimanale e' stata avviata correttamente"));
        }
    }   

    public function cancelAction($jobid, $pagenum = 1){
        $job = jobscheduled::where('id', '=', $jobid)->where('failed', '=', '0')->whereNull('executiontime')->first();
        if ($job){
            $job->canceled = 1;
            $job->save();
        }
        return $this->listAll($pagenum);
    }
    
}