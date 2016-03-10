#!/bin/bash

DATE=$(date +"%Y-%m-%d_%H%M%S")
resolution="640x480"
baseCocotteFolder=/home/pi/cocotte
CapturesFolder=$baseCocotteFolder/static/webcam/captures/
TimelapseFolder=$baseCocotteFolder/static/webcam/timelapse

#purge obsolete
#reorganise files
cd $TimelapseFolder/interieur/
ls -tr *.jpg| head -n -300 | xargs rm

cd $TimelapseFolder/exterieur/
ls -tr | head -n -300 | xargs rm

wget http://localhost:3000/data/webcamcaptureinterieur/?action=purge&maxAge=7
wget http://localhost:3000/data/webcamcaptureexterieur/?action=purge&maxAge=7

sudo service nodePoulePi stop
sudo service nodePOulePi start
