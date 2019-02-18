import struct
import sys

def hex_to_double(hex_str):

    return struct.unpack("d", hex_str.decode("hex")[::-1])

def double_to_hex():

    pass

if __name__ == "__main__":

    print hex_to_double(sys.argv[1])
