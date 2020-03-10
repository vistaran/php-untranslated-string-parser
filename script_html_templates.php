<?php 

    include "functions.php";

    // check if file is a directory
    if(!$argv[1]) {
        echo "Please provide file name or folder.";
        return;
    }

    if(is_dir($argv[1])) {
        $colors = new Colors();
        $files = getDirContents($argv[1]);

        foreach($files as $file) {
            if(!is_dir($file)) {
                echo "-------------------- \n " . $colors->getColoredString("FILE: $file", 'black', "cyan") . "\n\n";
                printStack($file);
                echo "\n\n";
            }
        }
    } else {
        try {
           printStack($argv[1]);
        } catch (\Exception $e) {
            echo $e->getMessage();
        }
    }