
import getpass
import bcrypt


def main() -> None:
    password = getpass.getpass("Elegí la contraseña del admin: ")
    confirmacion = getpass.getpass("Repetila: ")

    if password != confirmacion:
        print(" Las contraseñas no coinciden. Probá de nuevo.")
        return

    if len(password) < 8:
        print("Advertencia: es una contraseña corta, se recomienda 8+ caracteres.")

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    print("\nHash generado. Copiá esta línea a tu .env:\n")
    # Comillas simples a propósito: el hash tiene signos "$" y, sin comillas,
    # Docker Compose los interpreta como variables y deja el hash roto
    # (después el login falla con un 500). Con comillas simples funciona
    # igual en Docker y sin Docker.
    print(f"ADMIN_PASSWORD_HASH='{hashed}'")


if __name__ == "__main__":
    main()


import getpass
import bcrypt


def main() -> None:
    password = getpass.getpass("Elegí la contraseña del admin: ")
    confirmacion = getpass.getpass("Repetila: ")

    if password != confirmacion:
        print(" Las contraseñas no coinciden. Probá de nuevo.")
        return

    if len(password) < 8:
        print("Advertencia: es una contraseña corta, se recomienda 8+ caracteres.")

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    print("\nHash generado. Copiá esta línea a tu .env:\n")
    print(f"ADMIN_PASSWORD_HASH={hashed}")


if __name__ == "__main__":
    main()

