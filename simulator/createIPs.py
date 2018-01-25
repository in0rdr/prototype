#!/usr/bin/env python

'''
This module creates files with randow IP addresses in it.

:author: Lukas Eisenring
'''

import sys
import json
from random import randint

def createDumpFile(hosts, attackers, fileName):
    '''


    :param hosts:       Number of hosts under attack (int)
    :param attackers:   Number of attackers per hst (int)
    :param fileName:    Name of the file to create (string)
    '''
    # add content to a file
    with open(fileName, "w") as f:
        f.write(json.dumps(test_dict(hosts, attackers)))
        f.close()

def generate_multiple_ipv4(amount):
    temp = []
    for i in range(amount):
        temp.append(generate_ipv4())

    return temp

def generate_ipv4():
    """
    generates a random IPv4 address
    :return: ipv4 address as a string
    """
    return str(randint(1, 254)) + '.' + str(randint(1, 254)) + '.' + str(randint(1, 254)) + '.' + str(
        randint(1, 254))

def test_dict(hosts, attackers):
    dict = {}
    for i in range(hosts):
        dict[generate_ipv4()] = generate_multiple_ipv4(attackers)
    return dict

def main():
    args = sys.argv[1:]
    print json.dumps(test_dict(int(args[0]), int(args[1])))
    sys.stdout.flush()

if __name__ == "__main__":
    main()