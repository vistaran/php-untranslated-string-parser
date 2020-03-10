<?php 

    class Colors {
        private $foreground_colors = array();
        private $background_colors = array();

        public function __construct() {
            // Set up shell colors
            $this->foreground_colors['black'] = '0;30';
            $this->foreground_colors['dark_gray'] = '1;30';
            $this->foreground_colors['blue'] = '0;34';
            $this->foreground_colors['light_blue'] = '1;34';
            $this->foreground_colors['green'] = '0;32';
            $this->foreground_colors['light_green'] = '1;32';
            $this->foreground_colors['cyan'] = '0;36';
            $this->foreground_colors['light_cyan'] = '1;36';
            $this->foreground_colors['red'] = '0;31';
            $this->foreground_colors['light_red'] = '1;31';
            $this->foreground_colors['purple'] = '0;35';
            $this->foreground_colors['light_purple'] = '1;35';
            $this->foreground_colors['brown'] = '0;33';
            $this->foreground_colors['yellow'] = '1;33';
            $this->foreground_colors['light_gray'] = '0;37';
            $this->foreground_colors['white'] = '1;37';

            $this->background_colors['black'] = '40';
            $this->background_colors['red'] = '41';
            $this->background_colors['green'] = '42';
            $this->background_colors['yellow'] = '43';
            $this->background_colors['blue'] = '44';
            $this->background_colors['magenta'] = '45';
            $this->background_colors['cyan'] = '46';
            $this->background_colors['light_gray'] = '47';
        }

        // Returns colored string
        public function getColoredString($string, $foreground_color = null, $background_color = null) {
            $colored_string = "";

            // Check if given foreground color found
            if (isset($this->foreground_colors[$foreground_color])) {
                $colored_string .= "\033[" . $this->foreground_colors[$foreground_color] . "m";
            }
            // Check if given background color found
            if (isset($this->background_colors[$background_color])) {
                $colored_string .= "\033[" . $this->background_colors[$background_color] . "m";
            }

            // Add string and end coloring
            $colored_string .=  $string . "\033[0m";

            return $colored_string;
        }

        // Returns all foreground color names
        public function getForegroundColors() {
            return array_keys($this->foreground_colors);
        }

        // Returns all background color names
        public function getBackgroundColors() {
            return array_keys($this->background_colors);
        }
    }

    function getDirContents($dir, &$results = array()) {
        $files = scandir($dir);
    
        foreach ($files as $key => $value) {
            $path = realpath($dir . DIRECTORY_SEPARATOR . $value);
            if (!is_dir($path)) {
                $results[] = $path;
            } else if ($value != "." && $value != "..") {
                getDirContents($path, $results);
                $results[] = $path;
            }
        }
    
        return $results;
    }

    function printStack($file, $excludeKeywordsStr = '') {
        $excludeKeywords = explode(',', $excludeKeywordsStr);
        $colors = new Colors;

        $fileHandle = fopen($file, "r");
        if($file) {
            $i = 1;
            $total_matches = 0;

            // line by line check
            while(! feof($fileHandle)) {
                $content = fgets($fileHandle);
                // find untranslated scripts
                if(preg_match('/(>([a-zA-Z]){3,})|(>\s([a-zA-Z]){3,})/', $content)) {
                    if(!preg_match('/\{\{[a-zA-Z]/', $content)) {
                        $flag = false;
                        // check for excluded keywords
                        foreach($excludeKeywords as $w) {
                            if(!empty($w)) {
                                if(strpos($content, $w, 0)) {
                                    $flag = true;
                                }
                            }
                        }

                        if($flag) {
                            continue;
                        }

                        preg_match('/(>([a-zA-Z]){3,})|(>\s([a-zA-Z]){3,})/', $content, $matches);
                        // echo print_r($matches);
                        $column = strpos(trim($content), $matches[0]);
                        echo substr(trim($content), $column - 5, $column + 10) . " >>> " . $colors->getColoredString("LINE " . $i . ":$column", 'red', "black") . "\n\n";
                        $total_matches++;
                    } else {
                    }
                }
                $i++;
            }

            // full file check
            $contents = file_get_contents($file);
            if(preg_match_all('/>(\n)(\s){1,}[a-zA-Z]/', $contents)) {
                preg_match_all('/>(\n)(\s){1,}[a-zA-Z]{2,}/', $contents, $matches, PREG_OFFSET_CAPTURE);

                // print_r($matches);
                for ($i = 0; $i < count($matches[0]); $i++) {
                    $line = substr_count(substr($contents, 0, $matches[0][$i][1]), "\n") + 1;
                    // echo $line . "\n";
                    echo $matches[0][$i][0] . " >>> " . $colors->getColoredString("LINE " . $line, 'red', "black") . "\n\n";

                    $total_matches++;
                }
            }

            echo $colors->getColoredString("TOTAL: " . $total_matches . " matches.", 'red', 'green');
            fclose($fileHandle);
        }
    }

    function printProgrammingLangStack($file) {
        $colors = new Colors;

        $file = fopen($file, "r");
        if($file) {
            $i = 1;
            $total_matches = 0;
            while(! feof($file)) {
                $content = fgets($file);
                // find untranslated scripts
                if(preg_match('/(\s=\s"[a-zA-Z](.*)";)|([a-z]="[a-zA-Z](.*)";)|(\s=\s\'[a-zA-Z](.*)\';)|([a-z]=\'[a-zA-Z](.*)\';)/', $content)) {
                    
                    preg_match('/(\s=\s"[a-zA-Z](.*)";)|([a-z]="[a-zA-Z](.*)";)|(\s=\s\'[a-zA-Z](.*)\';)|([a-z]=\'[a-zA-Z](.*)\';)/', $content, $matches);

                    if(!empty($matches)) {
                        $column = strpos(trim($content), $matches[0]);
                        echo substr(trim($content), $column - 5, $column + 10) . " >>> " . $colors->getColoredString("LINE " . $i . ":$column", 'red', "black") . "\n";
                        $total_matches++;
                    }

                    // if(!empty($matches2)) {
                    //     $column = strpos(trim($content), $matches2[0]);
                    //     echo substr(trim($content), $column - 5, $column + 10) . " >>> " . $colors->getColoredString("LINE " . $i . ":$column", 'red', "black") . "\n";
                    //     $total_matches++;
                    // }
                }
                $i++;
            }
            echo $colors->getColoredString("TOTAL: " . $total_matches . " matches.", 'red', 'cyan');
            fclose($file);
        }
    }