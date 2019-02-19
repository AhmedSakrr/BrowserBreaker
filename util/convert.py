import struct
import sys

def hex_to_double(hex_str):

    return struct.unpack("d", hex_str.decode("hex")[::-1])

def double_to_hex(double_val):

    val = float(double_val)
    return hex(struct.unpack('<Q', struct.pack('<d', val))[0])

def str_to_double(target_str):

    target_hex_encode = target_str[::-1].encode("hex")
    return hex_to_double(target_hex_encode)

def convert(target):

    try:
        print hex_to_double(sys.argv[1])
    except:
        print double_to_hex(sys.argv[1])

if __name__ == "__main__":

    # print str_to_double(sys.argv[1])
    convert(sys.argv[1])
