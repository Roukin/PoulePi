### BEGIN INIT INFO
# Provides:          uv4l_webcam
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Start daemon at boot time
# Description:       Enable service provided by daemon.
### END INIT INFO
#! /bin/sh
# /etc/init.d/uv4l_webcam
#


# Carry out specific functions when asked to by the system
case "$1" in
  start)
    echo "Starting webcams"
    #interieur
	uv4l --video_nr 2 --driver uvc --device-id 046d:0819 --enable-server required --server-option '--port=8080'

	#exterieur
	uv4l --video_nr 3 --driver uvc --device-id 046d:0825 --enable-server required --server-option '--port=8085'

    echo "webcams started"
    ;;
  stop)
    echo "Stopping uv4l"
    pkill uv4l
    echo "uv4l stopped"
    ;;
  *)
    echo "Usage: /etc/init.d/uv4l_webcam {start|stop}"
    exit 1
    ;;
esac

exit 0






