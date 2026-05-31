import NavbarMenu from "./NavbarMenu";

function Navbar() {
  return (
    <div className="w-full bg-gray-200">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <img src="/logo.svg" className="h-24 shrink-0" alt="ParagonMedia Logo" />
        <NavbarMenu />
      </div>
    </div>
  );
}

export default Navbar;
