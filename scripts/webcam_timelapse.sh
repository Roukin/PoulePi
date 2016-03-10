#!/bin/bash

DATE=$(date +"%Y-%m-%d_%H%M%S")
resolution="640x480"
baseCocotteFolder=/home/pi/cocotte
CapturesFolder=$baseCocotteFolder/static/webcam/captures/
TimelapseFolder=$baseCocotteFolder/static/webcam/timelapse

#interieur
fswebcam -d /dev/video3 -r $resolution $TimelapseFolder/interieur/$DATE.jpg

#exterieur
fswebcam -d /dev/video2 -r $resolution $TimelapseFolder/exterieur/$DATE.jpg

#purge obsolete
#reorganise files
cd $TimelapseFolder/interieur/
ls -tr *.jpg| head -n -168 | xargs rm
ls -t *.jpg| awk 'BEGIN{ a=0 }{ printf "mv %s photo%03d.jpg\n", $0, a++ }' | bash

cd $TimelapseFolder/exterieur/
ls -tr | head -n -168 | xargs rm
ls -t *.jpg | awk 'BEGIN{ a=0 }{ printf "mv %s photo%03d.jpg\n", $0, a++ }' | bash

