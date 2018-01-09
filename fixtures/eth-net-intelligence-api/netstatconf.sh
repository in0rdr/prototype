# !/bin/bash

N=$1
shift
name_prefix=$1
shift
ws_server=$1
shift
ws_secret=$1
shift

echo -e "["

i=1
while [ $i -le $N ]; do
    #id=`printf "%02d" $i`
    rpc_host=$1
    if [ "$#" -gt 0 ]; then shift; fi

    single_template="  {\n    \"name\"        : \"$name_prefix$i\",\n    \"cwd\"         : \".\",\n    \"script\"      : \"app.js\",\n    \"log_date_format\"   : \"YYYY-MM-DD HH:mm Z\",\n    \"merge_logs\"    : false,\n    \"watch\"       : false,\n    \"exec_interpreter\"  : \"node\",\n    \"exec_mode\"     : \"fork_mode\",\n    \"env\":\n    {\n      \"NODE_ENV\"    : \"production\",\n      \"RPC_HOST\"    : \"$rpc_host\",\n      \"RPC_PORT\"    : \"8545\",\n      \"INSTANCE_NAME\"   : \"$name_prefix$i\",\n      \"WS_SERVER\"     : \"$ws_server\",\n      \"WS_SECRET\"     : \"$ws_secret\",\n    }\n  }"

    endline=""
    if [ "$i" -ne "$N" ]; then
        endline=","
    fi
    echo -e "$single_template$endline"
    i=$((i+1))
done

echo "]"
