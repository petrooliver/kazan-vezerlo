
import sys
import argparse

def main():
    parser = argparse.ArgumentParser(description="Kazan Vezérlő Szimuláció")
    parser.add_argument('--user', required=True)
    parser.add_argument('--password', required=True)
    parser.add_argument('--switch', required=True, choices=['on', 'off'])

    args = parser.parse_args()

    # Hitelesítés ellenőrzése
    if args.user != 'bosch' or args.password != 'bosch60':
        print("Helytelen user+pw kombo")
        sys.exit(1)

    # Kazán állapotának kiírása
    if args.switch == 'on':
        print("Working")
    elif args.switch == 'off':
        print("System down")

if __name__ == '__main__':
    main()