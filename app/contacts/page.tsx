import { ContactsPage } from "@/components/contacts/ContactsPage"
import { MobileContacts } from "@/components/mobile/MobileContacts"

export const metadata = {
  title: "연락처 관리 | K-run Contact Manager",
}

export default function ContactsRoute() {
  return (
    <>
      <div className="hidden md:block">
        <ContactsPage />
      </div>
      <div className="md:hidden h-[calc(100svh-4rem)] flex flex-col">
        <MobileContacts />
      </div>
    </>
  )
}
