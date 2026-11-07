import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, Switch, Table, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

/** A field of the form. Dates use the browser's time zone and travel as UTC. */
interface Field {
  name: string
  label: string
  type?: "text" | "number" | "datetime-local"
  optional?: boolean
}

interface Section {
  title: string
  path: string
  listKey: string
  summary: string
  fields: Field[]
}

type Row = Record<string, string | number | boolean | null>
type Draft = Record<string, string>

const DISPLAY_FIELDS: Field[] = [
  { name: "rank", label: "Ordem (menor aparece antes)", type: "number" },
  { name: "starts_at", label: "Início (opcional)", type: "datetime-local", optional: true },
  { name: "ends_at", label: "Fim (opcional)", type: "datetime-local", optional: true },
]

const SECTIONS: Section[] = [
  {
    title: "Banners",
    path: "/admin/content/banners",
    listKey: "banners",
    summary: "title",
    fields: [
      { name: "title", label: "Título" },
      { name: "image_url", label: "URL da imagem (https)" },
      { name: "image_alt", label: "Texto alternativo da imagem" },
      { name: "cta_label", label: "Texto do botão (opcional)", optional: true },
      { name: "cta_url", label: "Link do botão (opcional)", optional: true },
      ...DISPLAY_FIELDS,
    ],
  },
  {
    title: "Barra de avisos",
    path: "/admin/content/announcements",
    listKey: "announcements",
    summary: "message",
    fields: [
      { name: "message", label: "Mensagem" },
      { name: "link_url", label: "Link (opcional)", optional: true },
      ...DISPLAY_FIELDS,
    ],
  },
]

async function send(path: string, method: string, body?: unknown): Promise<unknown> {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data: unknown = await response.json()
  if (!response.ok) {
    throw new Error((data as { message?: string }).message ?? "Erro inesperado")
  }
  return data
}

/** `datetime-local` wants local time without a zone, while the API gives and takes UTC. */
function toLocalInput(value: string): string {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function toDraft(section: Section, row?: Row): Draft {
  const entries = section.fields.map(({ name, type }): [string, string] => {
    const value = row?.[name]
    if (value === undefined || value === null) {
      return [name, name === "rank" ? "0" : ""]
    }
    return [name, type === "datetime-local" ? toLocalInput(String(value)) : String(value)]
  })
  return Object.fromEntries(entries)
}

function toPayload(section: Section, draft: Draft, isPublished: boolean): Row {
  const entries = section.fields.map(({ name, type, optional }): [string, Row[string]] => {
    const value = draft[name]?.trim() ?? ""
    if (type === "number") {
      return [name, Number(value)]
    }
    if (optional && !value) {
      return [name, null]
    }
    return [name, type === "datetime-local" ? new Date(value).toISOString() : value]
  })
  return { ...Object.fromEntries(entries), is_published: isPublished }
}

function failure(error: unknown) {
  toast.error(error instanceof Error ? error.message : "Erro inesperado")
}

function ContentSection({ section }: { section: Section }) {
  const [rows, setRows] = useState<Row[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({})
  const [isPublished, setIsPublished] = useState(false)

  const load = useCallback(() => {
    send(section.path, "GET")
      .then((data) => setRows((data as Record<string, Row[]>)[section.listKey] ?? []))
      .catch(failure)
  }, [section])

  useEffect(load, [load])

  const open = (id: string, row?: Row) => {
    setEditing(id)
    setDraft(toDraft(section, row))
    setIsPublished(row?.is_published === true)
  }

  const save = () => {
    const path = editing === "new" ? section.path : `${section.path}/${editing}`
    send(path, "POST", toPayload(section, draft, isPublished))
      .then(() => {
        setEditing(null)
        toast.success("Salvo")
        load()
      })
      .catch(failure)
  }

  const remove = (id: string) => {
    if (window.confirm("Remover este item?")) {
      send(`${section.path}/${id}`, "DELETE").then(load).catch(failure)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{section.title}</Heading>
        <Button size="small" variant="secondary" onClick={() => open("new")}>
          Adicionar
        </Button>
      </div>
      {editing && (
        <form
          className="flex flex-col gap-3 px-6 py-4"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          {section.fields.map(({ name, label, type = "text", optional }) => (
            <div key={name} className="flex flex-col gap-1">
              <Label htmlFor={`${section.listKey}-${name}`}>{label}</Label>
              <Input
                id={`${section.listKey}-${name}`}
                type={type}
                required={!optional}
                value={draft[name] ?? ""}
                onChange={(event) => setDraft({ ...draft, [name]: event.target.value })}
              />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Switch
              id={`${section.listKey}-published`}
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Label htmlFor={`${section.listKey}-published`}>Publicado</Label>
          </div>
          <div className="flex gap-2">
            <Button size="small" type="submit">
              Salvar
            </Button>
            <Button size="small" variant="secondary" onClick={() => setEditing(null)} type="button">
              Cancelar
            </Button>
          </div>
        </form>
      )}
      {rows.length === 0 ? (
        <Text className="px-6 py-4">Nada cadastrado.</Text>
      ) : (
        <Table>
          <Table.Body>
            {rows.map((row) => {
              const id = String(row.id)
              return (
                <Table.Row key={id}>
                  <Table.Cell>{String(row[section.summary])}</Table.Cell>
                  <Table.Cell>{row.is_published ? "Publicado" : "Rascunho"}</Table.Cell>
                  <Table.Cell>{String(row.rank)}</Table.Cell>
                  <Table.Cell className="text-right">
                    <Button size="small" variant="transparent" onClick={() => open(id, row)}>
                      Editar
                    </Button>
                    <Button size="small" variant="transparent" onClick={() => remove(id)}>
                      Remover
                    </Button>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

/** Minimal on purpose: who may edit waits for Q-07, and banner images are URLs until EST-04.1. */
const HomeContentPage = () => (
  <div className="flex flex-col gap-4">
    {SECTIONS.map((section) => (
      <ContentSection key={section.path} section={section} />
    ))}
  </div>
)

export const config = defineRouteConfig({ label: "Conteúdo da home" })

export default HomeContentPage
