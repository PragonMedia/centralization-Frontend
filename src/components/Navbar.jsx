import NavbarMenu from "./NavbarMenu";

function Navbar() {
  return (
    <div className="w-full bg-gray-200">
      <div className="max-w-6xl mx-auto  flex items-center justify-between px-4 py-2 ">
        <img src="/src/assets/logo.svg" className="h-24" alt="" />
        <NavbarMenu />
      </div>
    </div>
  );
}

export default Navbar;
